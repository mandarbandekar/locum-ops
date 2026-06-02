DO $$
DECLARE
  uid uuid := '2372a7e3-f4ec-4e47-8f1a-1f36edb39869';
  tbl text;
  tables text[] := ARRAY[
    'shift_calendar_sync','calendar_sync_preferences','calendar_feed_tokens','calendar_connections',
    'confirmation_activity','confirmation_shift_links','confirmation_snapshots','confirmation_emails','confirmation_records',
    'invoice_activity','invoice_payments','invoice_line_items','invoice_pdf_downloads','invoices',
    'contract_attachments','contract_terms','contract_checklist_items','contracts',
    'facility_confirmation_settings','facility_contacts',
    'email_logs','shifts','facilities',
    'credential_packet_items','credential_packets','credential_history',
    'credential_reminders','credential_renewal_portals','credential_documents',
    'ce_credential_links','ce_entries',
    'document_links',
    'clinic_requirement_mappings','clinic_requirements',
    'compliance_activity_events','compliance_alerts','compliance_onboarding_state',
    'credentials',
    'expense_attachments','expenses','expense_config',
    'deduction_categories','cpa_questions','saved_tax_questions',
    'required_subscriptions',
    'reminder_category_settings','reminder_preferences','reminders',
    'imported_entities','import_files','import_jobs',
    'feedback_submissions','account_deletion_logs',
    'user_sign_in_events','user_profiles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', tbl) USING uid;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      NULL;
    END;
  END LOOP;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;