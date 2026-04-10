
-- Fix credential-documents UPDATE policy: add WITH CHECK
DROP POLICY IF EXISTS "Users can update own credential docs" ON storage.objects;
CREATE POLICY "Users can update own credential docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'credential-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fix expense-receipts UPDATE policy: add WITH CHECK
DROP POLICY IF EXISTS "Users can update own expense receipts" ON storage.objects;
CREATE POLICY "Users can update own expense receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
