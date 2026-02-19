export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          age: number
          created_at: string
          full_name: string
          gender: string
          id: string
          place: string
          referred_by_code: string | null
          screenshot_url: string | null
          whatsapp_number: string
        }
        Insert: {
          age: number
          created_at?: string
          full_name: string
          gender: string
          id?: string
          place: string
          referred_by_code?: string | null
          screenshot_url?: string | null
          whatsapp_number: string
        }
        Update: {
          age?: number
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          place?: string
          referred_by_code?: string | null
          screenshot_url?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      course_materials: {
        Row: {
          created_at: string
          created_by: string | null
          day_number: number
          details: string | null
          form_id: string | null
          id: string
          material_type: string
          material_url: string | null
          min_completion_time: number
          order_index: number
          quiz_id: string | null
          updated_at: string
          work_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_number: number
          details?: string | null
          form_id?: string | null
          id?: string
          material_type: string
          material_url?: string | null
          min_completion_time?: number
          order_index?: number
          quiz_id?: string | null
          updated_at?: string
          work_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_number?: number
          details?: string | null
          form_id?: string | null
          id?: string
          material_type?: string
          material_url?: string | null
          min_completion_time?: number
          order_index?: number
          quiz_id?: string | null
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          form_id: string | null
          id: string
          material_id: string
          responses: Json
          submitted_at: string
          user_id: string
        }
        Insert: {
          form_id?: string | null
          id?: string
          material_id: string
          responses?: Json
          submitted_at?: string
          user_id: string
        }
        Update: {
          form_id?: string | null
          id?: string
          material_id?: string
          responses?: Json
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string
          created_by: string | null
          display_duration: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          order_index: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_duration?: number
          id?: string
          is_active?: boolean
          media_type: string
          media_url: string
          order_index?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_duration?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          order_index?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          batch_number: number
          created_at: string
          email: string
          full_name: string
          gender: string
          id: string
          is_blocked: boolean
          place: string
          referral_code: string | null
          referred_by: string | null
          signup_source: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          batch_number?: number
          created_at?: string
          email: string
          full_name: string
          gender: string
          id?: string
          is_blocked?: boolean
          place: string
          referral_code?: string | null
          referred_by?: string | null
          signup_source?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          email?: string
          full_name?: string
          gender?: string
          id?: string
          is_blocked?: boolean
          place?: string
          referral_code?: string | null
          referred_by?: string | null
          signup_source?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      quiz_submissions: {
        Row: {
          answers: Json
          id: string
          material_id: string
          max_score: number
          quiz_id: string
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          material_id: string
          max_score?: number
          quiz_id: string
          score?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          material_id?: string
          max_score?: number
          quiz_id?: string
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          points_per_question: number
          questions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          points_per_question?: number
          questions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          points_per_question?: number
          questions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_at: string
          id: string
          material_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          material_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          added_by: string | null
          batch_number: number
          created_at: string
          email: string
          id: string
          password_reset_enabled: boolean
          phone_number: string | null
        }
        Insert: {
          added_by?: string | null
          batch_number?: number
          created_at?: string
          email: string
          id?: string
          password_reset_enabled?: boolean
          phone_number?: string | null
        }
        Update: {
          added_by?: string | null
          batch_number?: number
          created_at?: string
          email?: string
          id?: string
          password_reset_enabled?: boolean
          phone_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
