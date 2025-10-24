export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_summary: string
          activity_type: string
          course_id: string
          created_at: string | null
          feedback: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_summary: string
          activity_type: string
          course_id: string
          created_at?: string | null
          feedback: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_summary?: string
          activity_type?: string
          course_id?: string
          created_at?: string | null
          feedback?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      autograder_feedback: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string | null
          feedback_text: string
          id: string
          solution_file_names: string[]
          user_id: string
        }
        Insert: {
          assignment_id: string
          course_id: string
          created_at?: string | null
          feedback_text: string
          id?: string
          solution_file_names?: string[]
          user_id: string
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string | null
          feedback_text?: string
          id?: string
          solution_file_names?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autograder_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autograder_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_context_snapshots: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message_count: number
          summary: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message_count: number
          summary: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message_count?: number
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_context_snapshots_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: true
            referencedRelation: "document_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          sender: string
          tokens: number | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender: string
          tokens?: number | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "document_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          instructor: string | null
          lms_id: string
          lms_provider: string
          name: string
          semester: string | null
          updated_at: string
          year: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          instructor?: string | null
          lms_id: string
          lms_provider: string
          name: string
          semester?: string | null
          updated_at?: string
          year?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          instructor?: string | null
          lms_id?: string
          lms_provider?: string
          name?: string
          semester?: string | null
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      document_chats: {
        Row: {
          created_at: string
          document_id: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chats_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          card_count: number
          card_type: string
          course_id: string
          created_at: string | null
          description: string | null
          extra_context: string | null
          file_ids: string[]
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_count?: number
          card_type?: string
          course_id: string
          created_at?: string | null
          description?: string | null
          extra_context?: string | null
          file_ids?: string[]
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_count?: number
          card_type?: string
          course_id?: string
          created_at?: string | null
          description?: string | null
          extra_context?: string | null
          file_ids?: string[]
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          confidence_level: number | null
          created_at: string | null
          deck_id: string
          hint: string | null
          id: string
          last_viewed_at: string | null
          position: number
          question: string
          times_correct: number
          times_incorrect: number
          times_viewed: number
          updated_at: string | null
        }
        Insert: {
          answer: string
          confidence_level?: number | null
          created_at?: string | null
          deck_id: string
          hint?: string | null
          id?: string
          last_viewed_at?: string | null
          position?: number
          question: string
          times_correct?: number
          times_incorrect?: number
          times_viewed?: number
          updated_at?: string | null
        }
        Update: {
          answer?: string
          confidence_level?: number | null
          created_at?: string | null
          deck_id?: string
          hint?: string | null
          id?: string
          last_viewed_at?: string | null
          position?: number
          question?: string
          times_correct?: number
          times_incorrect?: number
          times_viewed?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      module_items: {
        Row: {
          content_type: string | null
          course_id: string
          created_at: string
          id: string
          lms_content_id: string | null
          lms_id: string
          module_id: string
          name: string
          position: number | null
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content_type?: string | null
          course_id: string
          created_at?: string
          id?: string
          lms_content_id?: string | null
          lms_id: string
          module_id: string
          name: string
          position?: number | null
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content_type?: string | null
          course_id?: string
          created_at?: string
          id?: string
          lms_content_id?: string | null
          lms_id?: string
          module_id?: string
          name?: string
          position?: number | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          items_count: number | null
          lms_id: string
          name: string
          prerequisites: string[] | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          items_count?: number | null
          lms_id: string
          name: string
          prerequisites?: string[] | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          items_count?: number | null
          lms_id?: string
          name?: string
          prerequisites?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string | null
          id: string
          quiz_id: string
          score: number
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id: string
          score: number
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string
          score?: number
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option_index: number
          created_at: string | null
          explanation: string
          id: string
          options: Json
          position: number
          question: string
          quiz_id: string
          updated_at: string | null
        }
        Insert: {
          correct_option_index: number
          created_at?: string | null
          explanation: string
          id?: string
          options: Json
          position?: number
          question: string
          quiz_id: string
          updated_at?: string | null
        }
        Update: {
          correct_option_index?: number
          created_at?: string | null
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question?: string
          quiz_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          difficulty: string
          extra_context: string | null
          file_ids: string[]
          id: string
          name: string
          question_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          difficulty?: string
          extra_context?: string | null
          file_ids?: string[]
          id?: string
          name: string
          question_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string
          extra_context?: string | null
          file_ids?: string[]
          id?: string
          name?: string
          question_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_base_url: string | null
          created_at: string
          encrypted_api_key: string
          id: string
          is_active: boolean | null
          lms_provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_base_url?: string | null
          created_at?: string
          encrypted_api_key: string
          id?: string
          is_active?: boolean | null
          lms_provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_base_url?: string | null
          created_at?: string
          encrypted_api_key?: string
          id?: string
          is_active?: boolean | null
          lms_provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          school_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          school_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

