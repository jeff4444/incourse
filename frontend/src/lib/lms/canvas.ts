import { Course, FileDetails, Module, ModuleItem, DiscussionTopic, Page } from "../types/course";
import { validateFileForProcessing } from "../utils/fileValidation";
import LMSProvider from "./lms-provider";

class CanvasProvider extends LMSProvider {
  apiBaseUrl: string;
  apiKey: string;

  constructor(apiBaseUrl: string, apiKey: string) {
    super();
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  convertCanvasCourse(courseData: any): Course {
    const fullCourseName = courseData.name;
    let courseSemester = "";
    let courseYear = "";
    let courseCode = "";
    if (fullCourseName != null) {
      if (fullCourseName.includes("Spring")) {
        courseSemester = "Spring";
      } else if (fullCourseName.includes("Summer")) {
        courseSemester = "Summer";
      } else if (fullCourseName.includes("Fall")) {
        courseSemester = "Fall";
      } else if (fullCourseName.includes("Winter")) {
        courseSemester = "Winter";
      }
      // match the year in the full course name
      const yearMatch = fullCourseName.match(/\d{4}/);
      if (yearMatch) {
        courseYear = yearMatch[0];
      } else {
        courseYear = "Not found";
      }

      // 2024 Fall Faculty-Student Team Project (VIP) (EECE-302-01)
      // 2024 Fall Microcomputer Design (EECE-416-01)
      // match what is in the last brackets
      const courseCodeMatch = fullCourseName.match(/\(([^)]+)\)$/);
      courseCode = courseCodeMatch ? courseCodeMatch[1] : "";
    } else {
      courseCode = "Not found";
      courseYear = "Not found";
      courseSemester = "Not found";
    }

    const course: Course = {
      id: courseData.id,
      lmsId: courseData.id,
      lmsProvider: "canvas",
      name: courseData.name,
      code: courseCode,
      instructor: null,
      description: courseData.description || null,
      semester: courseSemester,
      year: courseYear,
    };
    return course;
  }

  convertCanvasModule(moduleData: any, courseId: string): Module {
    const module: Module = {
      id: moduleData.id,
      lmsId: moduleData.id,
      courseId: courseId,
      name: moduleData.name,
      description: null,
      itemsCount: moduleData.items_count,
      moduleItems: [],
      prerequisites: moduleData.prerequisites || null,
    };
    return module;
  }

  convertCanvasModuleItem(
    moduleItemData: any,
    moduleId: string,
    courseId: string
  ): ModuleItem {

    // For Page type, use page_url as lmsContentId, otherwise use content_id
    const lmsContentId = moduleItemData.type === 'Page' 
      ? moduleItemData.page_url 
      : moduleItemData.content_id;

    const moduleItem: ModuleItem = {
      id: moduleItemData.id,
      lmsId: moduleItemData.id,
      name: moduleItemData.title,
      moduleId: moduleId,
      courseId: courseId,
      type: moduleItemData.type,
      url: moduleItemData.url,
      lmsContentId: lmsContentId,
      position: moduleItemData.position || null,
    };
    return moduleItem;
  }

  convertCanvasFileDetails(fileDetailsData: any): FileDetails {
    const contentType = fileDetailsData["content-type"];
    const fileName = fileDetailsData.filename;
    const fileSize = fileDetailsData.size;

    // Validate file for processing
    const validation = validateFileForProcessing(
      contentType,
      fileName,
      fileSize
    );

    const fileDetails: FileDetails = {
      id: fileDetailsData.id,
      canvasId: fileDetailsData.id,
      name: fileName,
      url: fileDetailsData.url,
      size: fileSize,
      type: contentType,
      isValidForProcessing: validation.isValid,
      validationError: validation.error || null,
      fileTypeName: validation.fileTypeName || null,
    };
    return fileDetails;
  }

  async getCourses(): Promise<Course[]> {
    const coursesResponse = await fetch(
      `${this.apiBaseUrl}/courses?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!coursesResponse.ok) {
      throw new Error(`Failed to fetch courses`);
    }
    const coursesData = await coursesResponse.json();

    // eliminate courses whose name is null
    const filteredCourses = coursesData.filter((course: any) => {
      if (course.access_restricted_by_date) {
        return false;
      }
      return true;
    });
    return filteredCourses.map((course: any) =>
      this.convertCanvasCourse(course)
    );
  }

  async getCourse(courseId: string): Promise<Course> {
    const response = await fetch(`${this.apiBaseUrl}/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch course");
    }
    const courseData = await response.json();
    return this.convertCanvasCourse(courseData);
  }

  async getCourseModules(courseId: string): Promise<Module[]> {
    const modulesResponse = await fetch(
      `${this.apiBaseUrl}/courses/${courseId}/modules?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!modulesResponse.ok) {
      throw new Error("Failed to fetch course modules");
    }
    const modulesData = await modulesResponse.json();
    const modules = modulesData.map((module: any) =>
      this.convertCanvasModule(module, courseId)
    );
    for (const module of modules) {
      const moduleItems = await this.getModuleItems(module.lmsId, courseId);
      module.moduleItems = moduleItems;
    }
    return modules;
  }

  async getModuleItems(
    moduleId: string,
    courseId: string
  ): Promise<ModuleItem[]> {
    const moduleItemsResponse = await fetch(
      `${this.apiBaseUrl}/courses/${courseId}/modules/${moduleId}/items?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!moduleItemsResponse.ok) {
      throw new Error("Failed to fetch module items");
    }
    const moduleItemsData = await moduleItemsResponse.json();
    const moduleItems = moduleItemsData.map((moduleItemData: any) => {
      try {
      const moduleItem = this.convertCanvasModuleItem(moduleItemData, moduleId, courseId);
        return moduleItem;
      } catch (error) {
        console.error(`Failed to convert module item ${moduleItemData.id}: ${error}`);
        return null;
      }
    });
    return moduleItems;
  }

  async getFileDetails(fileId: string, courseId: string): Promise<FileDetails> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/files/${fileId}`;

    const fileDetailsResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!fileDetailsResponse.ok) {
      throw new Error(`Failed to fetch file details ${url}`);
    }
    const fileDetailsData = await fileDetailsResponse.json();
    return this.convertCanvasFileDetails(fileDetailsData);
  }

  async getDiscussionTopic(topicId: string, courseId: string): Promise<DiscussionTopic> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/discussion_topics/${topicId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch discussion topic ${url}`);
    }
    const discussionData = await response.json();
    return discussionData as DiscussionTopic;
  }

  async getPage(pageUrl: string, courseId: string): Promise<Page> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/pages/${pageUrl}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${url}`);
    }
    const pageData = await response.json();
    return pageData as Page;
  }
}

export default CanvasProvider;
