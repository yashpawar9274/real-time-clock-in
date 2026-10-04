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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_push_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          photo_path: string | null
          push_notified_at: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          photo_path?: string | null
          push_notified_at?: string | null
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          photo_path?: string | null
          push_notified_at?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          employee_code: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          joining_date: string | null
          monthly_salary: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_code: string
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          joining_date?: string | null
          monthly_salary?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          joining_date?: string | null
          monthly_salary?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          attendance_days: number
          base_salary: number
          bonuses: number
          created_at: string
          deductions: number
          id: string
          net_salary: number | null
          notes: string | null
          paid_at: string | null
          salary_month: string
          status: Database["public"]["Enums"]["salary_status"]
          updated_at: string
          user_id: string
          working_days: number
        }
        Insert: {
          attendance_days?: number
          base_salary: number
          bonuses?: number
          created_at?: string
          deductions?: number
          id?: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          salary_month: string
          status?: Database["public"]["Enums"]["salary_status"]
          updated_at?: string
          user_id: string
          working_days?: number
        }
        Update: {
          attendance_days?: number
          base_salary?: number
          bonuses?: number
          created_at?: string
          deductions?: number
          id?: string
          net_salary?: number | null
          notes?: string | null
          paid_at?: string | null
          salary_month?: string
          status?: Database["public"]["Enums"]["salary_status"]
          updated_at?: string
          user_id?: string
          working_days?: number
        }
        Relationships: []
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
      weekly_offs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          off_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          off_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          off_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_attendance_status: {
        Args: { _status: string; _user_id: string; _work_date: string }
        Returns: boolean
      }
      generate_monthly_salaries: {
        Args: { _salary_month?: string }
        Returns: number
      }
      punch_in:
        | {
            Args: never
            Returns: {
              check_in: string
              check_out: string | null
              created_at: string
              id: string
              latitude: number | null
              longitude: number | null
              note: string | null
              photo_path: string | null
              push_notified_at: string | null
              updated_at: string
              user_id: string
              work_date: string
            }
            SetofOptions: {
              from: "*"
              to: "attendance"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { _photo_path: string }
            Returns: {
              check_in: string
              check_out: string | null
              created_at: string
              id: string
              latitude: number | null
              longitude: number | null
              note: string | null
              photo_path: string | null
              push_notified_at: string | null
              updated_at: string
              user_id: string
              work_date: string
            }
            SetofOptions: {
              from: "*"
              to: "attendance"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      punch_in_with_location: {
        Args: { _latitude: number; _longitude: number; _photo_path: string }
        Returns: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          photo_path: string | null
          push_notified_at: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      punch_out: {
        Args: never
        Returns: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          photo_path: string | null
          push_notified_at: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      salary_status: "draft" | "processed" | "paid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      salary_status: ["draft", "processed", "paid"],
    },
  },
} as const
