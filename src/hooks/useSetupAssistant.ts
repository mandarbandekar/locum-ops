import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { readFileAsText } from '@/lib/fileParser';

export type ImportLane = 'facilities' | 'contracts' | 'shifts';
export type ReviewStatus = 'pending' | 'confirmed' | 'edited' | 'skipped' | 'merged';
export type ConfidenceLevel = 'high' | 'medium' | 'needs_review';

export interface ImportedEntity {
  id: string;
  import_job_id: string;
  entity_type: string;
  raw_data: any;
  parsed_data: any;
  confidence_score: number | null;
  review_status: ReviewStatus;
}

export interface SetupSummary {
  facilities_imported: number;
  contracts_added: number;
  shifts_imported: number;
  items_need_review: number;
}

const db = (table: string) => supabase.from(table as any);

export function getConfidenceLevel(score: number | null): ConfidenceLevel {
  if (score === null) return 'needs_review';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'needs_review';
}

export function useSetupAssistant() {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [entities, setEntities] = useState<ImportedEntity[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const createJob = useCallback(async (sourceType: string) => {
    if (!user) return null;
    const { data, error } = await db('import_jobs')
      .insert({ source_type: sourceType } as any)
      .select()
      .single();
    if (error) {
      console.error('Create job error:', error);
      return null;
    }
    const jobId = (data as any).id;
    setCurrentJobId(jobId);
    return jobId;
  }, [user]);

  const uploadAndParse = useCallback(async (
    lane: ImportLane,
    content: string,
    fileName?: string,
    jobId?: string,
  ) => {
    if (!user) return null;
    setProcessing(true);
    try {
      const jid = jobId || currentJobId || await createJob(lane);
      if (!jid) throw new Error('Failed to create import job');

      const { data, error } = await supabase.functions.invoke('ai-setup-parse', {
        body: { import_job_id: jid, lane, content, file_name: fileName },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      // Fetch entities for this job
      const { data: ents } = await db('imported_entities')
        .select('*')
        .eq('import_job_id', jid)
        .order('created_at', { ascending: true });

      if (ents) {
        setEntities(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEnts = (ents as any[]).filter(e => !existingIds.has(e.id));
          return [...prev, ...newEnts];
        });
      }

      return data?.data;
    } catch (err: any) {
      console.error('Parse error:', err);
      toast.error(err.message || 'Failed to process import');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [user, currentJobId, createJob]);

  const uploadFile = useCallback(async (file: File, lane: ImportLane) => {
    if (!user) return null;
    setProcessing(true);
    try {
      const jobId = currentJobId || await createJob(lane);
      if (!jobId) throw new Error('Failed to create import job');

      // Upload to storage
      const path = `${user.id}/${jobId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('import-uploads')
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      // Record in import_files
      await db('import_files').insert({
        import_job_id: jobId,
        file_name: file.name,
        file_type: file.type,
        file_url: path,
        source_label: lane,
      } as any);

      // Read file content
      const text = await file.text();

      return await uploadAndParse(lane, text, file.name, jobId);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload file');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [user, currentJobId, createJob, uploadAndParse]);

  const updateEntityStatus = useCallback(async (entityId: string, status: ReviewStatus, editedData?: any) => {
    const updates: any = { review_status: status };
    if (editedData) updates.parsed_data = editedData;

    await db('imported_entities').update(updates).eq('id', entityId);
    setEntities(prev => prev.map(e =>
      e.id === entityId ? { ...e, review_status: status, ...(editedData ? { parsed_data: editedData } : {}) } : e
    ));
  }, []);

  const bulkConfirm = useCallback(async (entityIds: string[]) => {
    await db('imported_entities')
      .update({ review_status: 'confirmed' } as any)
      .in('id', entityIds);
    setEntities(prev => prev.map(e =>
      entityIds.includes(e.id) ? { ...e, review_status: 'confirmed' } : e
    ));
  }, []);

  const getSummary = useCallback((): SetupSummary => {
    const confirmed = entities.filter(e => e.review_status === 'confirmed' || e.review_status === 'edited');
    return {
      facilities_imported: confirmed.filter(e => e.entity_type === 'facility').length,
      contracts_added: confirmed.filter(e => e.entity_type === 'contract').length,
      shifts_imported: confirmed.filter(e => e.entity_type === 'shift').length,
      items_need_review: entities.filter(e => e.review_status === 'pending').length,
    };
  }, [entities]);

  return {
    processing,
    entities,
    currentJobId,
    createJob,
    uploadAndParse,
    uploadFile,
    updateEntityStatus,
    bulkConfirm,
    getSummary,
    setEntities,
  };
}
