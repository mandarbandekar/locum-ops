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
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          required?: boolean
          requirement_name: string
          requirement_type?: Database["public"]["Enums"]["credential_type"]
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          required?: boolean
          requirement_name?: string
          requirement_type?: Database["public"]["Enums"]["credential_type"]
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
