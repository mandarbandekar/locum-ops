import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadTaxDocFile, deleteTaxDocFile } from '@/lib/taxDocumentStorage';

export interface TaxDocument {
  id: string;
  user_id: string;
  doc_type: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  uploaded_at: string;
}

export function useTaxDocuments(docType: string = 'w9') {
  const { user, isDemo } = useAuth();
  const [docs, setDocs] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!user || isDemo) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('tax_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('doc_type', docType)
      .order('uploaded_at', { ascending: false });
    if (!error && data) setDocs(data as TaxDocument[]);
    setLoading(false);
  }, [user, isDemo, docType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const upload = useCallback(async (file: File, replaceExisting = true) => {
    if (!user) throw new Error('Not signed in');
    const filePath = await uploadTaxDocFile(user.id, file);
    if (replaceExisting && docs.length > 0) {
      for (const d of docs) {
        await deleteTaxDocFile(d.file_path);
        await supabase.from('tax_documents').delete().eq('id', d.id);
      }
    }
    const { error } = await supabase.from('tax_documents').insert({
      user_id: user.id,
      doc_type: docType,
      file_path: filePath,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });
    if (error) throw error;
    await fetchDocs();
  }, [user, docs, docType, fetchDocs]);

  const remove = useCallback(async (doc: TaxDocument) => {
    await deleteTaxDocFile(doc.file_path);
    const { error } = await supabase.from('tax_documents').delete().eq('id', doc.id);
    if (error) throw error;
    await fetchDocs();
  }, [fetchDocs]);

  return { docs, current: docs[0] ?? null, loading, upload, remove, refetch: fetchDocs };
}
