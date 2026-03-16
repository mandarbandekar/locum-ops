import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a signed URL for a file in any private Supabase Storage bucket.
 * Returns null if the URL cannot be generated.
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Open a stored file in a new browser tab.
 */
export async function viewStoredFile(bucket: string, filePath: string): Promise<boolean> {
  const url = await getSignedUrl(bucket, filePath);
  if (url) {
    window.open(url, '_blank');
    return true;
  }
  return false;
}

/**
 * Download a stored file by creating a temporary anchor link.
 */
export async function downloadStoredFile(
  bucket: string,
  filePath: string,
  fileName: string
): Promise<boolean> {
  const url = await getSignedUrl(bucket, filePath);
  if (url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    return true;
  }
  return false;
}
