import { supabase } from '@/integrations/supabase/client';

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
  // Bucket is private, so we need signed URLs instead
  return data.publicUrl;
}

export async function getContractSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600); // 1 hour
  if (error) return null;
  return data.signedUrl;
}

export async function deleteContractFile(filePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([filePath]);
}
