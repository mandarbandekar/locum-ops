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
      ce_credential_links: {
        Row: {
          ce_entry_id: string
          credential_id: string
          id: string
        }
        Insert: {
          ce_entry_id: string
          credential_id: string
          id?: string
        }
        Update: {
          ce_entry_id?: string
          credential_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_credential_links_ce_entry_id_fkey"
            columns: ["ce_entry_id"]
            isOneToOne: false
            referencedRelation: "ce_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_credential_links_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_entries: {
        Row: {
          category: string
          certificate_file_name: string | null
          certificate_file_url: string | null
          completion_date: string
          created_at: string
          delivery_format: string
          hours: number
          id: string
          notes: string | null
          provider: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          certificate_file_name?: string | null
          certificate_file_url?: string | null
          completion_date: string
          created_at?: string
          delivery_format?: string
          hours?: number
          id?: string
          notes?: string | null
          provider?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          certificate_file_name?: string | null
          certificate_file_url?: string | null
          completion_date?: string
          created_at?: string
          delivery_format?: string
          hours?: number
          id?: string
          notes?: string | null
          provider?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      confirmation_activity: {
        Row: {
          action: string
          confirmation_record_id: string
          created_at: string
          description: string
          id: string
        }
        Insert: {
          action: string
          confirmation_record_id: string
          created_at?: string
          description?: string
          id?: string
        }
        Update: {
          action?: string
          confirmation_record_id?: string
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_activity_confirmation_record_id_fkey"
            columns: ["confirmation_record_id"]
            isOneToOne: false
            referencedRelation: "confirmation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_records: {
        Row: {
          confirmed_at: string | null
          created_at: string
          facility_id: string
          id: string
          last_shift_snapshot_at: string | null
          message_body: string | null
          month_key: string
          notes: string | null
          sent_at: string | null
          share_token: string | null
          share_token_created_at: string | null
          share_token_revoked_at: string | null
          shift_count_snapshot: number | null
          shift_hash_snapshot: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          facility_id: string
          id?: string
          last_shift_snapshot_at?: string | null
          message_body?: string | null
          month_key: string
          notes?: string | null
          sent_at?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          share_token_revoked_at?: string | null
          shift_count_snapshot?: number | null
          shift_hash_snapshot?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          last_shift_snapshot_at?: string | null
          message_body?: string | null
          month_key?: string
          notes?: string | null
          sent_at?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          share_token_revoked_at?: string | null
          shift_count_snapshot?: number | null
          shift_hash_snapshot?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_records_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_shift_links: {
        Row: {
          confirmation_record_id: string
          id: string
          shift_id: string
        }
        Insert: {
          confirmation_record_id: string
          id?: string
          shift_id: string
        }
        Update: {
          confirmation_record_id?: string
          id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_shift_links_confirmation_record_id_fkey"
            columns: ["confirmation_record_id"]
            isOneToOne: false
            referencedRelation: "confirmation_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_shift_links_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_checklist_items: {
        Row: {
          created_at: string
          due_date: string | null
          facility_id: string
          id: string
          notes: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          facility_id: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          facility_id?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_checklist_items_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_terms: {
        Row: {
          cancellation_policy_text: string | null
          contract_id: string
          holiday_rate: number | null
          id: string
          invoicing_instructions_text: string | null
          late_payment_policy_text: string | null
          overtime_policy_text: string | null
          payment_terms_days: number | null
          updated_at: string
          user_id: string
          weekday_rate: number | null
          weekend_rate: number | null
        }
        Insert: {
          cancellation_policy_text?: string | null
          contract_id: string
          holiday_rate?: number | null
          id?: string
          invoicing_instructions_text?: string | null
          late_payment_policy_text?: string | null
          overtime_policy_text?: string | null
          payment_terms_days?: number | null
          updated_at?: string
          user_id?: string
          weekday_rate?: number | null
          weekend_rate?: number | null
        }
        Update: {
          cancellation_policy_text?: string | null
          contract_id?: string
          holiday_rate?: number | null
          id?: string
          invoicing_instructions_text?: string | null
          late_payment_policy_text?: string | null
          overtime_policy_text?: string | null
          payment_terms_days?: number | null
          updated_at?: string
          user_id?: string
          weekday_rate?: number | null
          weekend_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_terms_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean
          created_at: string
          effective_date: string | null
          end_date: string | null
          external_link_url: string | null
          facility_id: string
          file_url: string | null
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          external_link_url?: string | null
          facility_id: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          external_link_url?: string | null
          facility_id?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      cpa_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          resolved: boolean
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          resolved?: boolean
          source?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          resolved?: boolean
          source?: string
          updated_at?: string
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
      credential_renewal_portals: {
        Row: {
          created_at: string
          credential_id: string
          id: string
          renewal_password_encrypted: string | null
          renewal_portal_notes: string | null
          renewal_username: string | null
          renewal_website_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          id?: string
          renewal_password_encrypted?: string | null
          renewal_portal_notes?: string | null
          renewal_username?: string | null
          renewal_website_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          id?: string
          renewal_password_encrypted?: string | null
          renewal_portal_notes?: string | null
          renewal_username?: string | null
          renewal_website_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_renewal_portals_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: true
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          ce_required_hours: number | null
          ce_requirements_notes: string | null
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
          ce_required_hours?: number | null
          ce_requirements_notes?: string | null
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
          ce_required_hours?: number | null
          ce_requirements_notes?: string | null
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
      deduction_categories: {
        Row: {
          created_at: string
          documentation_status: string
          id: string
          missing_docs_count: number
          name: string
          notes: string
          receipt_completeness_percent: number
          updated_at: string
          user_id: string
          ytd_amount: number
        }
        Insert: {
          created_at?: string
          documentation_status?: string
          id?: string
          missing_docs_count?: number
          name: string
          notes?: string
          receipt_completeness_percent?: number
          updated_at?: string
          user_id?: string
          ytd_amount?: number
        }
        Update: {
          created_at?: string
          documentation_status?: string
          id?: string
          missing_docs_count?: number
          name?: string
          notes?: string
          receipt_completeness_percent?: number
          updated_at?: string
          user_id?: string
          ytd_amount?: number
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string
          clinic_access_info: string
          created_at: string
          id: string
          invoice_due_days: number
          invoice_prefix: string
          name: string
          notes: string
          outreach_last_sent_at: string | null
          status: string
          tech_computer_info: string
          tech_pims_info: string
          tech_wifi_info: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          clinic_access_info?: string
          created_at?: string
          id?: string
          invoice_due_days?: number
          invoice_prefix?: string
          name: string
          notes?: string
          outreach_last_sent_at?: string | null
          status?: string
          tech_computer_info?: string
          tech_pims_info?: string
          tech_wifi_info?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          clinic_access_info?: string
          created_at?: string
          id?: string
          invoice_due_days?: number
          invoice_prefix?: string
          name?: string
          notes?: string
          outreach_last_sent_at?: string | null
          status?: string
          tech_computer_info?: string
          tech_pims_info?: string
          tech_wifi_info?: string
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
      import_files: {
        Row: {
          file_name: string
          file_type: string | null
          file_url: string | null
          id: string
          import_job_id: string
          source_label: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          import_job_id: string
          source_label?: string
          uploaded_at?: string
          user_id?: string
        }
        Update: {
          file_name?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          import_job_id?: string
          source_label?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_files_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          source_type: string
          status: string
          summary: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          source_type?: string
          status?: string
          summary?: Json | null
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          source_type?: string
          status?: string
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      imported_entities: {
        Row: {
          confidence_score: number | null
          created_at: string
          entity_type: string
          id: string
          import_job_id: string
          parsed_data: Json | null
          raw_data: Json | null
          review_status: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          entity_type: string
          id?: string
          import_job_id: string
          parsed_data?: Json | null
          raw_data?: Json | null
          review_status?: string
          user_id?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          entity_type?: string
          id?: string
          import_job_id?: string
          parsed_data?: Json | null
          raw_data?: Json | null
          review_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_entities_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_activity: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_activity_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          service_date: string | null
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
          service_date?: string | null
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
          service_date?: string | null
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
      invoice_payments: {
        Row: {
          account: string
          amount: number
          created_at: string
          id: string
          invoice_id: string
          memo: string
          method: string
          payment_date: string
          user_id: string
        }
        Insert: {
          account?: string
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          memo?: string
          method?: string
          payment_date?: string
          user_id?: string
        }
        Update: {
          account?: string
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          memo?: string
          method?: string
          payment_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number
          created_at: string
          due_date: string | null
          facility_id: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string
          paid_at: string | null
          period_end: string
          period_start: string
          sent_at: string | null
          share_token: string | null
          share_token_created_at: string | null
          share_token_revoked_at: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_due?: number
          created_at?: string
          due_date?: string | null
          facility_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type?: string
          notes?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          sent_at?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          share_token_revoked_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_due?: number
          created_at?: string
          due_date?: string | null
          facility_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          sent_at?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          share_token_revoked_at?: string | null
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
      reminder_category_settings: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          enabled: boolean
          id: string
          in_app_enabled: boolean
          sms_enabled: boolean
          timing_config: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          timing_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          sms_enabled?: boolean
          timing_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          phone_number: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_email: string | null
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          phone_number?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_email?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          phone_number?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_email?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          body: string
          channel: string
          created_at: string
          dismissed_at: string | null
          id: string
          module: string
          related_entity_id: string | null
          related_entity_type: string | null
          reminder_type: string
          send_at: string
          sent_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          channel?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          module: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type: string
          send_at?: string
          sent_at?: string | null
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          module?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type?: string
          send_at?: string
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      required_subscriptions: {
        Row: {
          archived_at: string | null
          auto_renew: boolean | null
          billing_frequency: string
          category: string
          cost: number | null
          created_at: string
          currency: string | null
          id: string
          name: string
          notes: string | null
          provider: string
          renewal_date: string | null
          status: string
          updated_at: string
          used_for: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          auto_renew?: boolean | null
          billing_frequency?: string
          category?: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          name: string
          notes?: string | null
          provider?: string
          renewal_date?: string | null
          status?: string
          updated_at?: string
          used_for?: string | null
          user_id?: string
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          auto_renew?: boolean | null
          billing_frequency?: string
          category?: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          notes?: string | null
          provider?: string
          renewal_date?: string | null
          status?: string
          updated_at?: string
          used_for?: string | null
          user_id?: string
          website_url?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tax_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          item_key: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_key: string
          label: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_key?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_profiles: {
        Row: {
          admin_complexity_ok: boolean | null
          created_at: string
          current_entity_type: string
          id: string
          income_up_this_year: boolean | null
          multi_facility_work: boolean | null
          payroll_active: boolean | null
          projected_annual_profit: number | null
          relief_income_major_source: boolean | null
          reserve_percent: number | null
          retirement_interest: boolean | null
          stable_income: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_complexity_ok?: boolean | null
          created_at?: string
          current_entity_type?: string
          id?: string
          income_up_this_year?: boolean | null
          multi_facility_work?: boolean | null
          payroll_active?: boolean | null
          projected_annual_profit?: number | null
          relief_income_major_source?: boolean | null
          reserve_percent?: number | null
          retirement_interest?: boolean | null
          stable_income?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_complexity_ok?: boolean | null
          created_at?: string
          current_entity_type?: string
          id?: string
          income_up_this_year?: boolean | null
          multi_facility_work?: boolean | null
          payroll_active?: boolean | null
          projected_annual_profit?: number | null
          relief_income_major_source?: boolean | null
          reserve_percent?: number | null
          retirement_interest?: boolean | null
          stable_income?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          holiday_rate: number
          id: string
          late_payment_policy_text: string
          overtime_policy_text: string
          partial_day_rate: number
          special_notes: string
          telemedicine_rate: number
          updated_at: string
          user_id: string
          weekday_rate: number
          weekend_rate: number
        }
        Insert: {
          cancellation_policy_text?: string
          created_at?: string
          facility_id: string
          holiday_rate?: number
          id?: string
          late_payment_policy_text?: string
          overtime_policy_text?: string
          partial_day_rate?: number
          special_notes?: string
          telemedicine_rate?: number
          updated_at?: string
          user_id: string
          weekday_rate?: number
          weekend_rate?: number
        }
        Update: {
          cancellation_policy_text?: string
          created_at?: string
          facility_id?: string
          holiday_rate?: number
          id?: string
          late_payment_policy_text?: string
          overtime_policy_text?: string
          partial_day_rate?: number
          special_notes?: string
          telemedicine_rate?: number
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
          company_address: string
          company_name: string
          created_at: string
          currency: string
          current_tools: Json
          email_tone: string
          facilities_count_band: string
          first_name: string
          id: string
          invoice_due_default_days: number
          invoice_email: string | null
          invoice_phone: string | null
          invoice_prefix: string
          invoices_per_month_band: string
          last_name: string
          onboarding_completed_at: string | null
          profession: string
          terms_fields_enabled: Json
          timezone: string
          updated_at: string
          user_id: string
          work_style_label: string
        }
        Insert: {
          company_address?: string
          company_name?: string
          created_at?: string
          currency?: string
          current_tools?: Json
          email_tone?: string
          facilities_count_band?: string
          first_name?: string
          id?: string
          invoice_due_default_days?: number
          invoice_email?: string | null
          invoice_phone?: string | null
          invoice_prefix?: string
          invoices_per_month_band?: string
          last_name?: string
          onboarding_completed_at?: string | null
          profession?: string
          terms_fields_enabled?: Json
          timezone?: string
          updated_at?: string
          user_id: string
          work_style_label?: string
        }
        Update: {
          company_address?: string
          company_name?: string
          created_at?: string
          currency?: string
          current_tools?: Json
          email_tone?: string
          facilities_count_band?: string
          first_name?: string
          id?: string
          invoice_due_default_days?: number
          invoice_email?: string | null
          invoice_phone?: string | null
          invoice_prefix?: string
          invoices_per_month_band?: string
          last_name?: string
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
      waitlist_leads: {
        Row: {
          created_at: string
          email: string
          facility_count: string
          headache: string
          id: string
          persona: string
          profession: string
          source_page: string
        }
        Insert: {
          created_at?: string
          email: string
          facility_count?: string
          headache?: string
          id?: string
          persona?: string
          profession?: string
          source_page?: string
        }
        Update: {
          created_at?: string
          email?: string
          facility_count?: string
          headache?: string
          id?: string
          persona?: string
          profession?: string
          source_page?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owns_ce_entry: {
        Args: { _ce_entry_id: string; _user_id: string }
        Returns: boolean
      }
      owns_confirmation: {
        Args: { _confirmation_id: string; _user_id: string }
        Returns: boolean
      }
      owns_credential: {
        Args: { _credential_id: string; _user_id: string }
        Returns: boolean
      }
      owns_packet: {
        Args: { _packet_id: string; _user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
