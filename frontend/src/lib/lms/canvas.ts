import { Course, File, Module, ModuleItem, DiscussionTopic, Page, Assignment } from "../types/course";
import LMSProvider from "./lms-provider";


const ALLOWED_FILE_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

class CanvasProvider extends LMSProvider {
  apiBaseUrl: string;
  apiKey: string;

  constructor(apiBaseUrl: string, apiKey: string) {
    super();
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  private async handleFetchError(response: Response, context: string): Promise<never> {
    let errorDetails = "";
    try {
      const errorBody = await response.text();
      errorDetails = errorBody ? ` - ${errorBody}` : "";
    } catch (e) {
      // If we can't read the error body, that's fine
    }
    throw new Error(
      `${context}: ${response.status} ${response.statusText}${errorDetails}`
    );
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

    let type: string | null = null;
    if (!moduleItemData.type && ALLOWED_FILE_CONTENT_TYPES.includes(moduleItemData["content-type"])) {
      type = 'File';
    } else if (!moduleItemData.type) {
      type = moduleItemData["content-type"];
    } else {
      type = moduleItemData.type;
    }

    const moduleItem: ModuleItem = {
      id: moduleItemData.id,
      lmsId: moduleItemData.id,
      name: moduleItemData.title,
      moduleId: moduleId,
      courseId: courseId,
      type: type || '',
      url: moduleItemData.url,
      lmsContentId: lmsContentId,
      position: moduleItemData.position || null,
    };
    return moduleItem;
  }

  convertCanvasFileDetails(fileDetailsData: any, moduleItemId: string, courseId: string): File {
    const contentType = fileDetailsData["content-type"];
    const displayName = fileDetailsData.display_name || fileDetailsData.filename;
    const fileSize = fileDetailsData.size;
    const uuid = fileDetailsData.uuid;

    const file: File = {
      id: fileDetailsData.id,
      lmsId: fileDetailsData.id,
      moduleItemId: moduleItemId,
      courseId: courseId,
      displayName: displayName,
      contentType: contentType,
      url: fileDetailsData.url,
      uuid: uuid,
      size: fileSize,
      createdAt: fileDetailsData.created_at,
      updatedAt: fileDetailsData.updated_at,
    };
    return file;
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
      await this.handleFetchError(coursesResponse, "Failed to fetch courses");
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
    }    );
    if (!response.ok) {
      await this.handleFetchError(response, `Failed to fetch course ${courseId}`);
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
      await this.handleFetchError(modulesResponse, `Failed to fetch modules for course ${courseId}`);
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
      await this.handleFetchError(moduleItemsResponse, `Failed to fetch items for module ${moduleId}`);
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

  convertCanvasPage(pageData: any, moduleItemId: string, courseId: string): Page {
    const page: Page = {
      id: pageData.page_id?.toString(),
      lmsId: pageData.page_id?.toString(),
      moduleItemId: moduleItemId,
      courseId: courseId,
      title: pageData.title,
      url: pageData.url,
      createdAt: pageData.created_at,
      htmlUrl: pageData.html_url,
      body: pageData.body,
      createdAtDb: new Date().toISOString(),
      updatedAt: pageData.updated_at,
    };
    return page;
  }

  convertCanvasDiscussionTopic(discussionData: any, moduleItemId: string, courseId: string): DiscussionTopic {
    const discussion: DiscussionTopic = {
      id: discussionData.id?.toString(),
      lmsId: discussionData.id?.toString(),
      moduleItemId: moduleItemId,
      courseId: courseId,
      title: discussionData.title,
      createdAt: discussionData.created_at,
      lastReplyAt: discussionData.last_reply_at,
      postedAt: discussionData.posted_at,
      message: discussionData.message,
      htmlUrl: discussionData.html_url,
      discussionSubentryCount: discussionData.discussion_subentry_count || 0,
      subscribed: discussionData.subscribed || false,
      readState: discussionData.read_state,
      permissions: discussionData.permissions ? {
        attach: discussionData.permissions.attach || false,
        reply: discussionData.permissions.reply || false,
      } : null,
      createdAtDb: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return discussion;
  }

  async getFileDetails(fileId: string, courseId: string): Promise<any> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/files/${fileId}`;

    const fileDetailsResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    }    );
    if (!fileDetailsResponse.ok) {
      await this.handleFetchError(fileDetailsResponse, `Failed to fetch file details for ${url}`);
    }
    const fileDetailsData = await fileDetailsResponse.json();
    return fileDetailsData;
  }

  async getDiscussionTopic(topicId: string, courseId: string): Promise<any> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/discussion_topics/${topicId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      await this.handleFetchError(response, `Failed to fetch discussion topic ${url}`);
    }
    const discussionData = await response.json();
    return discussionData;
  }

  async getCourseFiles(courseId: string): Promise<File[]> {
    const filesResponse = await fetch(
      `${this.apiBaseUrl}/courses/${courseId}/files?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!filesResponse.ok) {
      return [];
    }
    const filesData = await filesResponse.json();
    const fileDetailsList: any[] = [];
    for (const fileData of filesData) {
      const fileDetails = await this.getFileDetails(fileData.id, courseId);
      fileDetailsList.push(fileDetails);
    }
    return fileDetailsList;
  }

  async getPage(pageUrl: string, courseId: string): Promise<any> {
    const url = `${this.apiBaseUrl}/courses/${courseId}/pages/${pageUrl}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      await this.handleFetchError(response, `Failed to fetch page ${url}`);
    }
    const pageData = await response.json();
    return pageData;
  }

  convertCanvasAssignment(assignmentData: any): Assignment {
    const assignment: Assignment = {
      id: assignmentData.id.toString(),
      lms_id: assignmentData.id.toString(),
      name: assignmentData.name,
      description: assignmentData.description || null,
      due_at: assignmentData.due_at || null,
      lock_at: assignmentData.lock_at || null,
      locked_for_user: assignmentData.locked_for_user || false,
      points_possible: assignmentData.points_possible || null,
      html_url: assignmentData.html_url,
      submission_types: assignmentData.submission_types || [],
      has_submitted_submissions: assignmentData.has_submitted_submissions || false,
    };
    return assignment;
  }

  async getCourseAssignments(courseId: string): Promise<Assignment[]> {
    const assignmentsResponse = await fetch(
      `${this.apiBaseUrl}/courses/${courseId}/assignments?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!assignmentsResponse.ok) {
      await this.handleFetchError(assignmentsResponse, `Failed to fetch assignments for course ${courseId}`);
    }
    const assignmentsData = await assignmentsResponse.json();
    
    return assignmentsData.map((assignment: any) =>
      this.convertCanvasAssignment(assignment)
    );
  }
}

export default CanvasProvider;
