-- Fix ce_entries: drop both name variants then recreate as PERMISSIVE for authenticated
DROP POLICY IF EXISTS "Users can CRUD own CE entries" ON public.ce_entries;
DROP POLICY IF EXISTS "Users can CRUD own CE entries " ON public.ce_entries;
CREATE POLICY "Users can CRUD own CE entries"
  ON public.ce_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own CE credential links" ON public.ce_credential_links;
DROP POLICY IF EXISTS "Users can CRUD own CE credential links " ON public.ce_credential_links;
CREATE POLICY "Users can CRUD own CE credential links"
  ON public.ce_credential_links FOR ALL TO authenticated
  USING (owns_ce_entry(auth.uid(), ce_entry_id))
  WITH CHECK (owns_ce_entry(auth.uid(), ce_entry_id));

DROP POLICY IF EXISTS "Users can CRUD own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can CRUD own contracts " ON public.contracts;
CREATE POLICY "Users can CRUD own contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own contract terms" ON public.contract_terms;
DROP POLICY IF EXISTS "Users can CRUD own contract terms " ON public.contract_terms;
CREATE POLICY "Users can CRUD own contract terms"
  ON public.contract_terms FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own checklist items" ON public.contract_checklist_items;
DROP POLICY IF EXISTS "Users can CRUD own checklist items " ON public.contract_checklist_items;
CREATE POLICY "Users can CRUD own checklist items"
  ON public.contract_checklist_items FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own credentials" ON public.credentials;
DROP POLICY IF EXISTS "Users can CRUD own credentials " ON public.credentials;
CREATE POLICY "Users can CRUD own credentials"
  ON public.credentials FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own documents" ON public.credential_documents;
DROP POLICY IF EXISTS "Users can CRUD own documents " ON public.credential_documents;
CREATE POLICY "Users can CRUD own documents"
  ON public.credential_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage history of own credentials" ON public.credential_history;
DROP POLICY IF EXISTS "Users can manage history of own credentials " ON public.credential_history;
CREATE POLICY "Users can manage history of own credentials"
  ON public.credential_history FOR ALL TO authenticated
  USING (owns_credential(auth.uid(), credential_id))
  WITH CHECK (owns_credential(auth.uid(), credential_id));

DROP POLICY IF EXISTS "Users can CRUD own packets" ON public.credential_packets;
DROP POLICY IF EXISTS "Users can CRUD own packets " ON public.credential_packets;
CREATE POLICY "Users can CRUD own packets"
  ON public.credential_packets FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own packet items" ON public.credential_packet_items;
DROP POLICY IF EXISTS "Users can manage own packet items " ON public.credential_packet_items;
CREATE POLICY "Users can manage own packet items"
  ON public.credential_packet_items FOR ALL TO authenticated
  USING (owns_packet(auth.uid(), packet_id))
  WITH CHECK (owns_packet(auth.uid(), packet_id));

DROP POLICY IF EXISTS "Users can CRUD own reminders" ON public.credential_reminders;
DROP POLICY IF EXISTS "Users can CRUD own reminders " ON public.credential_reminders;
CREATE POLICY "Users can CRUD own reminders"
  ON public.credential_reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own clinic requirements" ON public.clinic_requirements;
DROP POLICY IF EXISTS "Users can CRUD own clinic requirements " ON public.clinic_requirements;
CREATE POLICY "Users can CRUD own clinic requirements"
  ON public.clinic_requirements FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own clinic mappings" ON public.clinic_requirement_mappings;
DROP POLICY IF EXISTS "Users can CRUD own clinic mappings " ON public.clinic_requirement_mappings;
CREATE POLICY "Users can CRUD own clinic mappings"
  ON public.clinic_requirement_mappings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can CRUD own email logs " ON public.email_logs;
CREATE POLICY "Users can CRUD own email logs"
  ON public.email_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own facilities" ON public.facilities;
DROP POLICY IF EXISTS "Users can CRUD own facilities " ON public.facilities;
CREATE POLICY "Users can CRUD own facilities"
  ON public.facilities FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own contacts" ON public.facility_contacts;
DROP POLICY IF EXISTS "Users can CRUD own contacts " ON public.facility_contacts;
CREATE POLICY "Users can CRUD own contacts"
  ON public.facility_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own invoice activity" ON public.invoice_activity;
DROP POLICY IF EXISTS "Users can CRUD own invoice activity " ON public.invoice_activity;
CREATE POLICY "Users can CRUD own invoice activity"
  ON public.invoice_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can CRUD own line items " ON public.invoice_line_items;
CREATE POLICY "Users can CRUD own line items"
  ON public.invoice_line_items FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can CRUD own payments " ON public.invoice_payments;
CREATE POLICY "Users can CRUD own payments"
  ON public.invoice_payments FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can CRUD own invoices " ON public.invoices;
CREATE POLICY "Users can CRUD own invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile " ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile " ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can CRUD own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can CRUD own shifts " ON public.shifts;
CREATE POLICY "Users can CRUD own shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own tax quarter statuses" ON public.tax_quarter_statuses;
DROP POLICY IF EXISTS "Users can CRUD own tax quarter statuses " ON public.tax_quarter_statuses;
CREATE POLICY "Users can CRUD own tax quarter statuses"
  ON public.tax_quarter_statuses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own tax settings" ON public.tax_settings;
DROP POLICY IF EXISTS "Users can CRUD own tax settings " ON public.tax_settings;
CREATE POLICY "Users can CRUD own tax settings"
  ON public.tax_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own terms" ON public.terms_snapshots;
DROP POLICY IF EXISTS "Users can CRUD own terms " ON public.terms_snapshots;
CREATE POLICY "Users can CRUD own terms"
  ON public.terms_snapshots FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can CRUD own user_profiles " ON public.user_profiles;
CREATE POLICY "Users can CRUD own user_profiles"
  ON public.user_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);