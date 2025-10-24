export interface Course {
  id: string | null;
  lmsId: string | null;
  lmsProvider: string;
  name: string;
  code: string;
  instructor: string | null;
  description: string | null;
  semester: string | null;
  year: string | null;
  calendar: string | null;
}

export interface Module {
  id: string | null;
  lmsId: string | null;
  courseId: string;
  name: string;
  description: string | null;
  itemsCount: number;
  moduleItems: ModuleItem[];
  prerequisites: string[] | null;
}

export interface ModuleItem {
  id: string | null;
  lmsId: string | null;
  lmsContentId: string | null;
  name: string;
  moduleId: string;
  courseId: string;
  type: string;
  url: string | null;
  position: number | null;
}

export interface FlashcardDeck {
  id: string | null;
  courseId: string;
  moduleIds: string[];
  name: string;
  description: string | null;
  itemsCount: number;
  flashcardItems: FlashcardItem[];
}

export interface FlashcardItem {
  id: string | null;
  question: string;
  answer: string;
}

export interface Quiz {
  id: string | null;
  courseId: string;
  moduleIds: string[];
  name: string;
  description: string | null;
  itemsCount: number;
  previousAttempts: number;
  previousScore: number;
  quizItems: Question[];
}

export interface Question {
  id: string | null;
  question: string;
  options: string[];
  correctOption: number;
  explanation: string | null;
}

export interface File {
  id: string | null;
  lmsId: string | null;
  moduleItemId: string | null;
  courseId: string;
  displayName: string;
  contentType: string | null;
  url: string | null;
  uuid: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string | null;
  lmsId: string | null;
  moduleItemId: string;
  courseId: string;
  title: string;
  url: string | null;
  createdAt: string | null;
  htmlUrl: string | null;
  body: string | null;
  createdAtDb: string;
  updatedAt: string;
}

export interface DiscussionTopic {
  id: string | null;
  lmsId: string | null;
  moduleItemId: string;
  courseId: string;
  title: string;
  createdAt: string | null;
  lastReplyAt: string | null;
  postedAt: string | null;
  message: string | null;
  htmlUrl: string | null;
  discussionSubentryCount: number;
  subscribed: boolean;
  readState: string | null;
  permissions: {
    attach: boolean;
    reply: boolean;
  } | null;
  createdAtDb: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  lms_id: string;
  name: string;
  description: string | null;
  due_at: string | null;
  lock_at: string | null;
  locked_for_user: boolean;
  points_possible: number | null;
  html_url: string;
  submission_types: string[];
  has_submitted_submissions: boolean;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  course_id: string;
  folder_id: string | null;
  title: string;
  content: any; // Tiptap JSON
  position: number;
  created_at: string;
  updated_at: string;
}
