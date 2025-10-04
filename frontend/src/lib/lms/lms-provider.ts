import { Course, FileDetails, Module, ModuleItem, DiscussionTopic, Page } from "../types/course";

abstract class LMSProvider {
    abstract getCourses(): Promise<Course[]>;
    abstract getCourse(courseId: string): Promise<Course>;
    abstract getCourseModules(courseId: string): Promise<Module[]>;
    abstract getModuleItems(moduleId: string, courseId: string): Promise<ModuleItem[]>;
    abstract getFileDetails(fileId: string, courseId: string): Promise<FileDetails>;
    abstract getDiscussionTopic(topicId: string, courseId: string): Promise<DiscussionTopic>;
    abstract getPage(pageUrl: string, courseId: string): Promise<Page>;
}

export default LMSProvider;