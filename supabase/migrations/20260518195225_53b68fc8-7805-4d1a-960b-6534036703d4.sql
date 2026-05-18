-- Tax documents table
CREATE TABLE public.tax_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'w9',
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_documents_user ON public.tax_documents(user_id, doc_type);

ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tax documents"
  ON public.tax_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tax documents"
  ON public.tax_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tax documents"
  ON public.tax_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tax documents"
  ON public.tax_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_tax_documents_updated_at
  BEFORE UPDATE ON public.tax_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-documents', 'tax-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: files keyed by {user_id}/...
CREATE POLICY "Users read own tax documents files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own tax documents files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own tax documents files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own tax documents files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);