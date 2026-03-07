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
      clinic_requirement_mappings: {
        Row: {
          clinic_id: string
          created_at: string
          credential_id: string | null
          document_id: string | null
          expires_at: string | null
          id: string
          notes: string | null
          requirement_id: string
          status: Database["public"]["Enums"]["requirement_status"]
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          credential_id?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          requirement_id: string
          status?: Database["public"]["Enums"]["requirement_status"]
          submitted_at?: string | null
          user_id?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          credential_id?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          requirement_id?: string
          status?: Database["public"]["Enums"]["requirement_status"]
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_requirement_mappings_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_requirement_mappings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "credential_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_requirement_mappings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "clinic_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_requirements: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          required: boolean
          requirement_name: string
          requirement_type: Database["public"]["Enums"]["credential_type"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          required?: boolean
          requirement_name: string
          requirement_type?: Database["public"]["Enums"]["credential_type"]
          user_id?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          required?: boolean
          requirement_name?: string
          requirement_type?: Database["public"]["Enums"]["credential_type"]
          user_id?: string
        }
        Relationships: []
      }
      credential_documents: {
        Row: {
          credential_id: string | null
          document_category: Database["public"]["Enums"]["document_category"]
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploaded_at: string
          user_id: string
          version_number: number
        }
        Insert: {
          credential_id?: string | null
          document_category?: Database["public"]["Enums"]["document_category"]
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
          version_number?: number
        }
        Update: {
          credential_id?: string | null
          document_category?: Database["public"]["Enums"]["document_category"]
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "credential_documents_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_history: {
        Row: {
          action_type: Database["public"]["Enums"]["renewal_action_type"]
          created_at: string
          credential_id: string
          id: string
          new_expiration_date: string | null
          notes: string | null
          previous_expiration_date: string | null
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["renewal_action_type"]
          created_at?: string
          credential_id: string
          id?: string
          new_expiration_date?: string | null
          notes?: string | null
          previous_expiration_date?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["renewal_action_type"]
          created_at?: string
          credential_id?: string
          id?: string
          new_expiration_date?: string | null
          notes?: string | null
          previous_expiration_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_history_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_packet_items: {
        Row: {
          created_at: string
          credential_id: string | null
          document_id: string | null
          id: string
          packet_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          document_id?: string | null
          id?: string
          packet_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          document_id?: string | null
          id?: string
          packet_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "credential_packet_items_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_packet_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "credential_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_packet_items_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "credential_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_packets: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          packet_status: Database["public"]["Enums"]["packet_status"]
          sent_at: string | null
          share_token: string | null
          title: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          packet_status?: Database["public"]["Enums"]["packet_status"]
          sent_at?: string | null
          share_token?: string | null
          title: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          packet_status?: Database["public"]["Enums"]["packet_status"]
          sent_at?: string | null
          share_token?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      credential_reminders: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          credential_id: string
          id: string
          remind_at: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          credential_id: string
          id?: string
          remind_at: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          credential_id?: string
          id?: string
          remind_at?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_reminders_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          credential_number: string | null
          credential_type: Database["public"]["Enums"]["credential_type"]
          custom_title: string
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          jurisdiction: string | null
          notes: string | null
          renewal_frequency: string | null
          status: Database["public"]["Enums"]["credential_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_number?: string | null
          credential_type?: Database["public"]["Enums"]["credential_type"]
          custom_title: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          jurisdiction?: string | null
          notes?: string | null
          renewal_frequency?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_number?: string | null
          credential_type?: Database["public"]["Enums"]["credential_type"]
          custom_title?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          jurisdiction?: string | null
          notes?: string | null
          renewal_frequency?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string
          created_at: string
          facility_id: string
          id: string
          recipients: string
          sent_at: string
          subject: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          facility_id: string
          id?: string
          recipients?: string
          sent_at?: string
          subject?: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          facility_id?: string
          id?: string
          recipients?: string
          sent_at?: string
          subject?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
          notes: string
          outreach_last_sent_at: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          outreach_last_sent_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          outreach_last_sent_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facility_contacts: {
        Row: {
          created_at: string
          email: string
          facility_id: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          facility_id: string
          id?: string
          is_primary?: boolean
          name: string
          phone?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          facility_id?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_contacts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          qty: number
          shift_id: string | null
          unit_rate: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          line_total?: number
          qty?: number
          shift_id?: string | null
          unit_rate?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          qty?: number
          shift_id?: string | null
          unit_rate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          facility_id: string
          id: string
          invoice_number: string
          paid_at: string | null
          period_end: string
          period_start: string
          sent_at: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          facility_id: string
          id?: string
          invoice_number: string
          paid_at?: string | null
          period_end: string
          period_start: string
          sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          facility_id?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          color: string
          created_at: string
          end_datetime: string
          facility_id: string
          id: string
          notes: string
          rate_applied: number
          start_datetime: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_datetime: string
          facility_id: string
          id?: string
          notes?: string
          rate_applied?: number
          start_datetime: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          end_datetime?: string
          facility_id?: string
          id?: string
          notes?: string
          rate_applied?: number
          start_datetime?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_quarter_statuses: {
        Row: {
          created_at: string
          due_date: string
          id: string
          notes: string
          quarter: number
          status: string
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          notes?: string
          quarter: number
          status?: string
          tax_year: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          notes?: string
          quarter?: number
          status?: string
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          created_at: string
          disclaimer_accepted_at: string | null
          filing_type_label: string
          id: string
          set_aside_fixed_monthly: number
          set_aside_mode: string
          set_aside_percent: number
          state_label: string
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disclaimer_accepted_at?: string | null
          filing_type_label?: string
          id?: string
          set_aside_fixed_monthly?: number
          set_aside_mode?: string
          set_aside_percent?: number
          state_label?: string
          tax_year: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disclaimer_accepted_at?: string | null
          filing_type_label?: string
          id?: string
          set_aside_fixed_monthly?: number
          set_aside_mode?: string
          set_aside_percent?: number
          state_label?: string
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terms_snapshots: {
        Row: {
          cancellation_policy_text: string
          created_at: string
          facility_id: string
          id: string
          late_payment_policy_text: string
          overtime_policy_text: string
          special_notes: string
          updated_at: string
          user_id: string
          weekday_rate: number
          weekend_rate: number
        }
        Insert: {
          cancellation_policy_text?: string
          created_at?: string
          facility_id: string
          id?: string
          late_payment_policy_text?: string
          overtime_policy_text?: string
          special_notes?: string
          updated_at?: string
          user_id: string
          weekday_rate?: number
          weekend_rate?: number
        }
        Update: {
          cancellation_policy_text?: string
          created_at?: string
          facility_id?: string
          id?: string
          late_payment_policy_text?: string
          overtime_policy_text?: string
          special_notes?: string
          updated_at?: string
          user_id?: string
          weekday_rate?: number
          weekend_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "terms_snapshots_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          currency: string
          current_tools: Json
          email_tone: string
          facilities_count_band: string
          id: string
          invoice_due_default_days: number
          invoice_prefix: string
          invoices_per_month_band: string
          onboarding_completed_at: string | null
          profession: string
          terms_fields_enabled: Json
          timezone: string
          updated_at: string
          user_id: string
          work_style_label: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_tools?: Json
          email_tone?: string
          facilities_count_band?: string
          id?: string
          invoice_due_default_days?: number
          invoice_prefix?: string
          invoices_per_month_band?: string
          onboarding_completed_at?: string | null
          profession?: string
          terms_fields_enabled?: Json
          timezone?: string
          updated_at?: string
          user_id: string
          work_style_label?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_tools?: Json
          email_tone?: string
          facilities_count_band?: string
          id?: string
          invoice_due_default_days?: number
          invoice_prefix?: string
          invoices_per_month_band?: string
          onboarding_completed_at?: string | null
          profession?: string
          terms_fields_enabled?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
          work_style_label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_credential: {
        Args: { _credential_id: string; _user_id: string }
        Returns: boolean
      }
      owns_packet: {
        Args: { _packet_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      credential_status:
        | "active"
        | "expiring_soon"
        | "expired"
        | "renewing"
        | "archived"
      credential_type:
        | "veterinary_license"
        | "dea_registration"
        | "state_controlled_substance"
        | "usda_accreditation"
        | "malpractice_insurance"
        | "professional_liability_insurance"
        | "workers_comp_policy"
        | "business_license"
        | "llc_scorp_registration"
        | "w9"
        | "ce_certificate"
        | "background_check"
        | "contractor_onboarding"
        | "vaccination_health_record"
        | "custom"
      document_category:
        | "license"
        | "registration"
        | "insurance"
        | "tax"
        | "onboarding"
        | "ce"
        | "legal_business"
        | "identity"
        | "custom"
      packet_status: "draft" | "ready" | "sent" | "expired"
      reminder_status: "pending" | "sent" | "acknowledged" | "snoozed"
      reminder_type: "email" | "sms" | "in_app"
      renewal_action_type: "renewed" | "updated" | "created" | "archived"
      requirement_status: "pending" | "complete" | "expired" | "missing"
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
      credential_status: [
        "active",
        "expiring_soon",
        "expired",
        "renewing",
        "archived",
      ],
      credential_type: [
        "veterinary_license",
        "dea_registration",
        "state_controlled_substance",
        "usda_accreditation",
        "malpractice_insurance",
        "professional_liability_insurance",
        "workers_comp_policy",
        "business_license",
        "llc_scorp_registration",
        "w9",
        "ce_certificate",
        "background_check",
        "contractor_onboarding",
        "vaccination_health_record",
        "custom",
      ],
      document_category: [
        "license",
        "registration",
        "insurance",
        "tax",
        "onboarding",
        "ce",
        "legal_business",
        "identity",
        "custom",
      ],
      packet_status: ["draft", "ready", "sent", "expired"],
      reminder_status: ["pending", "sent", "acknowledged", "snoozed"],
      reminder_type: ["email", "sms", "in_app"],
      renewal_action_type: ["renewed", "updated", "created", "archived"],
      requirement_status: ["pending", "complete", "expired", "missing"],
    },
  },
} as const
