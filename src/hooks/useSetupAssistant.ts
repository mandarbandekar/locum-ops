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
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // Record in import_files
      await db('import_files').insert({
        import_job_id: jobId,
        file_name: file.name,
        file_type: file.type,
        file_url: path,
        source_label: lane,
      } as any);

      // Read file content (handles Excel binary files)
      const text = await readFileAsText(file);

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

  /**
   * Materialize confirmed/edited entities into the real workspace tables.
   * This is the critical step that actually creates facilities, contacts, terms, and shifts.
   */
  const materializeConfirmed = useCallback(async (
    addFacility: (f: any) => Promise<any>,
    addContact: (c: any) => Promise<void>,
    updateTerms: (t: any) => Promise<void>,
    addShift: (s: any) => Promise<any>,
  ) => {
    if (!user) return;

    const confirmed = entities.filter(e =>
      e.review_status === 'confirmed' || e.review_status === 'edited'
    );

    // Track facility name -> created facility id for linking contacts/terms/shifts
    const facilityNameMap: Record<string, string> = {};

    // 1. Create facilities first
    const facilityEntities = confirmed.filter(e => e.entity_type === 'facility');
    for (const entity of facilityEntities) {
      const d = entity.parsed_data;
      try {
        const facility = await addFacility({
          name: d.name || 'Unnamed Facility',
          status: 'active' as const,
          address: d.address || '',
          timezone: d.timezone || 'America/New_York',
          notes: d.notes || '',
          outreach_last_sent_at: null,
          tech_computer_info: '',
          tech_wifi_info: '',
          tech_pims_info: '',
          clinic_access_info: '',
          invoice_prefix: (d.name || 'FAC').substring(0, 3).toUpperCase(),
          invoice_due_days: d.payment_terms_days || 30,
          invoice_email_to: '',
          invoice_email_cc: '',
          invoice_email_bcc: '',
        });

        facilityNameMap[d.name?.toLowerCase() || ''] = facility.id;

        // Create contact if extracted alongside the facility
        if (d.contact_name) {
          const emails = (d.contact_email || '').split(',').map((e: string) => e.trim());
          const names = (d.contact_name || '').split('/').map((n: string) => n.trim());
          
          for (let i = 0; i < names.length; i++) {
            if (names[i]) {
              await addContact({
                facility_id: facility.id,
                name: names[i],
                role: d.contact_role || 'Practice Manager',
                email: emails[i] || emails[0] || '',
                phone: d.contact_phone || '',
                is_primary: i === 0,
              });
            }
          }
        }

        // Create terms if rates were extracted
        if (d.weekday_rate || d.weekend_rate || d.holiday_rate) {
          await updateTerms({
            id: `import-${facility.id}`,
            facility_id: facility.id,
            weekday_rate: d.weekday_rate || 0,
            weekend_rate: d.weekend_rate || 0,
            partial_day_rate: 0,
            holiday_rate: d.holiday_rate || 0,
            telemedicine_rate: 0,
            cancellation_policy_text: d.cancellation_policy || '',
            overtime_policy_text: d.overtime_policy || '',
            late_payment_policy_text: d.late_payment_policy || '',
            special_notes: '',
          });
        }
      } catch (err) {
        console.error(`Failed to create facility ${d.name}:`, err);
      }
    }

    // 2. Create contract terms (standalone)
    const contractEntities = confirmed.filter(e => e.entity_type === 'contract');
    for (const entity of contractEntities) {
      const d = entity.parsed_data;
      const facilityId = facilityNameMap[d.facility_name?.toLowerCase() || ''];
      if (facilityId && (d.weekday_rate || d.cancellation_policy || d.payment_terms_days)) {
        try {
          await updateTerms({
            id: `import-contract-${facilityId}`,
            facility_id: facilityId,
            weekday_rate: d.weekday_rate || 0,
            weekend_rate: d.weekend_rate || 0,
            partial_day_rate: 0,
            holiday_rate: d.holiday_rate || 0,
            telemedicine_rate: 0,
            cancellation_policy_text: d.cancellation_policy || '',
            overtime_policy_text: d.overtime_policy || '',
            late_payment_policy_text: d.late_payment_policy || '',
            special_notes: d.invoicing_instructions || '',
          });
        } catch (err) {
          console.error('Failed to create contract terms:', err);
        }
      }
    }

    // 3. Create shifts
    const shiftEntities = confirmed.filter(e => e.entity_type === 'shift');
    for (const entity of shiftEntities) {
      const d = entity.parsed_data;
      const facilityId = facilityNameMap[d.facility_name?.toLowerCase() || ''];
      if (facilityId) {
        try {
          await addShift({
            facility_id: facilityId,
            start_datetime: d.start_time || d.date,
            end_datetime: d.end_time || d.date,
            rate_applied: 0,
            status: d.status === 'proposed' ? 'proposed' : 'booked',
            notes: d.notes || '',
            color: 'blue',
          });
        } catch (err) {
          console.error('Failed to create shift:', err);
        }
      }
    }

    // Update import job status
    if (currentJobId) {
      await db('import_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary: {
          facilities_imported: facilityEntities.length,
          contracts_added: contractEntities.length,
          shifts_imported: shiftEntities.length,
        },
      } as any).eq('id', currentJobId);
    }
  }, [user, entities, currentJobId]);

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
    materializeConfirmed,
    getSummary,
    setEntities,
  };
}
