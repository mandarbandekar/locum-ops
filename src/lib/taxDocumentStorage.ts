import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, viewStoredFile, downloadStoredFile } from '@/lib/storageUtils';

export const TAX_DOCS_BUCKET = 'tax-documents';

export async function uploadTaxDocFile(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(TAX_DOCS_BUCKET)
    .upload(filePath, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return filePath;
}

export async function deleteTaxDocFile(filePath: string): Promise<void> {
  await supabase.storage.from(TAX_DOCS_BUCKET).remove([filePath]);
}

export async function viewTaxDocFile(filePath: string) {
  return viewStoredFile(TAX_DOCS_BUCKET, filePath);
}

export async function downloadTaxDocFile(filePath: string, fileName: string) {
  return downloadStoredFile(TAX_DOCS_BUCKET, filePath, fileName);
}

export async function getTaxDocSignedUrl(filePath: string) {
  return getSignedUrl(TAX_DOCS_BUCKET, filePath, 300);
}
