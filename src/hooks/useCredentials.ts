import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { demoCredentials, demoDocuments } from '@/data/credentialsSeed';

type CredentialRow = Database['public']['Tables']['credentials']['Row'];
type CredentialInsert = Database['public']['Tables']['credentials']['Insert'];
type CredentialUpdate = Database['public']['Tables']['credentials']['Update'];
type DocumentInsert = Database['public']['Tables']['credential_documents']['Insert'];
type CredentialTypeEnum = Database['public']['Enums']['credential_type'];
type CredentialStatusEnum = Database['public']['Enums']['credential_status'];
type DocumentCategoryEnum = Database['public']['Enums']['document_category'];

export type Credential = CredentialRow;

export interface CredentialDocument {
  id: string;
  user_id: string;
  credential_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  document_category: string;
  version_number: number;
  uploaded_at: string;
  updated_at: string;
}

export function useCredentials() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const credentialsQuery = useQuery({
    queryKey: ['credentials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const documentsQuery = useQuery({
    queryKey: ['credential_documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credential_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as CredentialDocument[];
    },
    enabled: !!user,
  });

  const addCredential = useMutation({
    mutationFn: async (credential: {
      credential_type: string;
      custom_title: string;
      jurisdiction?: string | null;
      issuing_authority?: string | null;
      credential_number?: string | null;
      issue_date?: string | null;
      expiration_date?: string | null;
      renewal_frequency?: string | null;
      status?: string;
      notes?: string;
      tags?: string[];
      ce_required_hours?: number | null;
      ce_requirements_notes?: string | null;
    }) => {
      const insertData: any = {
        user_id: user!.id,
        credential_type: credential.credential_type as CredentialTypeEnum,
        custom_title: credential.custom_title,
        jurisdiction: credential.jurisdiction,
        issuing_authority: credential.issuing_authority,
        credential_number: credential.credential_number,
        issue_date: credential.issue_date,
        expiration_date: credential.expiration_date,
        renewal_frequency: credential.renewal_frequency,
        status: (credential.status || 'active') as CredentialStatusEnum,
        notes: credential.notes || '',
        tags: credential.tags || [],
        ce_required_hours: credential.ce_required_hours ?? null,
      };
      const { data, error } = await supabase
        .from('credentials')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast({ title: 'Credential added', description: 'Your credential has been saved.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const updateCredential = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const updateData: any = {};
      if (updates.credential_type !== undefined) updateData.credential_type = updates.credential_type as CredentialTypeEnum;
      if (updates.custom_title !== undefined) updateData.custom_title = updates.custom_title as string;
      if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction as string | null;
      if (updates.issuing_authority !== undefined) updateData.issuing_authority = updates.issuing_authority as string | null;
      if (updates.credential_number !== undefined) updateData.credential_number = updates.credential_number as string | null;
      if (updates.issue_date !== undefined) updateData.issue_date = updates.issue_date as string | null;
      if (updates.expiration_date !== undefined) updateData.expiration_date = updates.expiration_date as string | null;
      if (updates.renewal_frequency !== undefined) updateData.renewal_frequency = updates.renewal_frequency as string | null;
      if (updates.status !== undefined) updateData.status = updates.status as CredentialStatusEnum;
      if (updates.notes !== undefined) updateData.notes = updates.notes as string;
      if (updates.tags !== undefined) updateData.tags = updates.tags as string[];
      if (updates.ce_required_hours !== undefined) updateData.ce_required_hours = updates.ce_required_hours;

      const { data, error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast({ title: 'Credential updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credentials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast({ title: 'Credential deleted' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const uploadDocument = async (file: File, credentialId?: string, category: string = 'custom') => {
    if (!user) throw new Error('Not authenticated');
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('credential-documents')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const insertData: DocumentInsert = {
      user_id: user.id,
      credential_id: credentialId || null,
      file_name: file.name,
      file_url: filePath,
      file_type: file.type,
      document_category: category as DocumentCategoryEnum,
    };

    const { data, error } = await supabase
      .from('credential_documents')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
    return data;
  };

  return {
    credentials: isDemo ? demoCredentials : (credentialsQuery.data ?? []),
    documents: isDemo ? demoDocuments : (documentsQuery.data ?? []),
    isLoading: isDemo ? false : credentialsQuery.isLoading,
    isDocumentsLoading: documentsQuery.isLoading,
    addCredential,
    updateCredential,
    deleteCredential,
    uploadDocument,
  };
}
