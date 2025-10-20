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
  contentType: string | null;
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

export interface FileDetails {
  id: string | null;
  canvasId: string | null;
  name: string;
  size: number;
  type: string;
  contentType: string | null;
  url: string;
  isValidForProcessing?: boolean;
  validationError?: string | null;
  fileTypeName?: string | null;
}

export interface DiscussionTopic {
  id: number;
  title: string;
  created_at: string;
  last_reply_at: string;
  message: string;
  discussion_subentry_count: number;
  subscribed: boolean;
  read_state: string;
  html_url: string;
  permissions: {
    attach: boolean;
    reply: boolean;
  };
}

export interface Page {
  title: string;
  created_at: string;
  url: string;
  editing_roles: string;
  page_id: number;
  last_edited_by: {
    id: number;
    anonymous_id: string;
    display_name: string;
    avatar_image_url: string;
    html_url: string;
    pronouns: string;
  };
  published: boolean;
  hide_from_students: boolean;
  front_page: boolean;
  html_url: string;
  todo_date: string | null;
  publish_at: string | null;
  updated_at: string;
  locked_for_user: boolean;
  body: string;
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
