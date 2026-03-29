CREATE POLICY "Users can update own contract documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'contract-documents' AND (storage.foldername(name))[1] = (auth.uid())::text);