import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Credential {
  id: string;
  user_id: string;
  credential_type: string;
  custom_title: string;
  jurisdiction: string | null;
  issuing_authority: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  renewal_frequency: string | null;
  status: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

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
  const { user } = useAuth();
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
      return data as Credential[];
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
    mutationFn: async (credential: Omit<Credential, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('credentials')
        .insert({ ...credential, user_id: user!.id })
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
    mutationFn: async ({ id, ...updates }: Partial<Credential> & { id: string }) => {
      const { data, error } = await supabase
        .from('credentials')
        .update(updates)
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

    const { data: urlData } = supabase.storage
      .from('credential-documents')
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('credential_documents')
      .insert({
        user_id: user.id,
        credential_id: credentialId || null,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        document_category: category,
      })
      .select()
      .single();
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['credential_documents'] });
    return data;
  };

  return {
    credentials: credentialsQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: credentialsQuery.isLoading,
    isDocumentsLoading: documentsQuery.isLoading,
    addCredential,
    updateCredential,
    deleteCredential,
    uploadDocument,
  };
}
