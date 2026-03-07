
-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false);

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can read their own files
CREATE POLICY "Users can read own contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can delete their own files
CREATE POLICY "Users can delete own contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
