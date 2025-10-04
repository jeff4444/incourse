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
  url: string;
  isValidForProcessing?: boolean;
  validationError?: string | null;
  fileTypeName?: string | null;
}

export interface DiscussionTopic {
  id: number;
  title: string;
  last_reply_at: string;
  created_at: string;
  delayed_post_at: string | null;
  posted_at: string;
  assignment_id: number | null;
  root_topic_id: number | null;
  position: number | null;
  podcast_has_student_posts: boolean;
  discussion_type: string;
  lock_at: string | null;
  allow_rating: boolean;
  only_graders_can_rate: boolean;
  sort_by_rating: boolean;
  is_section_specific: boolean;
  anonymous_state: string | null;
  summary_enabled: boolean;
  user_name: string | null;
  discussion_subentry_count: number;
  permissions: {
    attach: boolean;
    update: boolean;
    reply: boolean;
    delete: boolean;
    manage_assign_to: boolean;
  };
  require_initial_post: boolean | null;
  user_can_see_posts: boolean;
  podcast_url: string | null;
  read_state: string;
  unread_count: number;
  subscribed: boolean;
  attachments: any[];
  published: boolean;
  can_unpublish: boolean;
  locked: boolean;
  can_lock: boolean;
  comments_disabled: boolean;
  author: any;
  html_url: string;
  url: string;
  pinned: boolean;
  group_category_id: number | null;
  can_group: boolean;
  topic_children: any[];
  group_topic_children: any[];
  ungraded_discussion_overrides: any[];
  locked_for_user: boolean;
  message: string;
  todo_date: string | null;
  is_announcement: boolean;
  sort_order: string;
  sort_order_locked: boolean;
  expanded: boolean;
  expanded_locked: boolean;
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
