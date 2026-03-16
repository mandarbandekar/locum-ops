import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, viewStoredFile } from '@/lib/storageUtils';

const BUCKET = 'contract-documents';

export async function uploadContractFile(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false });

  if (error) throw error;
  return filePath;
}

export function getContractFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getContractSignedUrl(filePath: string): Promise<string | null> {
  return getSignedUrl(BUCKET, filePath);
}

export async function viewContractFile(filePath: string): Promise<boolean> {
  return viewStoredFile(BUCKET, filePath);
}

export async function deleteContractFile(filePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([filePath]);
}
