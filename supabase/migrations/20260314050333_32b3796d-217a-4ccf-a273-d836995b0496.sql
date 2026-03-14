
-- Import tracking tables
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_type text NOT NULL DEFAULT 'spreadsheet',
  status text NOT NULL DEFAULT 'pending',
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own import jobs"
  ON public.import_jobs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  file_name text NOT NULL,
  file_type text,
  file_url text,
  source_label text NOT NULL DEFAULT 'upload',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own import files"
  ON public.import_files FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.imported_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL,
  raw_data jsonb DEFAULT '{}'::jsonb,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric,
  review_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own imported entities"
  ON public.imported_entities FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for import uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('import-uploads', 'import-uploads', false);

CREATE POLICY "Users can upload import files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'import-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own import files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'import-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own import files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'import-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
