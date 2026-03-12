import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { demoCEEntriesWithLinks, demoCELinks, demoCEEntries } from '@/data/credentialsSeed';

export interface CEEntry {
  id: string;
  user_id: string;
  title: string;
  provider: string;
  completion_date: string;
  hours: number;
  category: string;
  notes: string | null;
  certificate_file_url: string | null;
  certificate_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CECredentialLink {
  id: string;
  ce_entry_id: string;
  credential_id: string;
}

export interface CEEntryWithLinks extends CEEntry {
  linked_credential_ids: string[];
}

export function useCEEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const entriesQuery = useQuery({
    queryKey: ['ce_entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_entries')
        .select('*')
        .order('completion_date', { ascending: false });
      if (error) throw error;
      return data as CEEntry[];
    },
    enabled: !!user,
  });

  const linksQuery = useQuery({
    queryKey: ['ce_credential_links', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_credential_links')
        .select('*');
      if (error) throw error;
      return data as CECredentialLink[];
    },
    enabled: !!user,
  });

  const entriesWithLinks: CEEntryWithLinks[] = (entriesQuery.data ?? []).map(entry => ({
    ...entry,
    linked_credential_ids: (linksQuery.data ?? [])
      .filter(l => l.ce_entry_id === entry.id)
      .map(l => l.credential_id),
  }));

  const addCEEntry = useMutation({
    mutationFn: async (input: {
      title: string;
      provider: string;
      completion_date: string;
      hours: number;
      category: string;
      notes?: string;
      certificate_file_url?: string | null;
      certificate_file_name?: string | null;
      linked_credential_ids: string[];
    }) => {
      const { linked_credential_ids, ...entryData } = input;
      const { data: entry, error } = await supabase
        .from('ce_entries')
        .insert({ ...entryData, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      if (linked_credential_ids.length > 0) {
        const links = linked_credential_ids.map(credential_id => ({
          ce_entry_id: entry.id,
          credential_id,
        }));
        const { error: linkError } = await supabase
          .from('ce_credential_links')
          .insert(links);
        if (linkError) throw linkError;
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_entries'] });
      queryClient.invalidateQueries({ queryKey: ['ce_credential_links'] });
      toast({ title: 'CE entry added' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const updateCEEntry = useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      provider: string;
      completion_date: string;
      hours: number;
      category: string;
      notes?: string;
      certificate_file_url?: string | null;
      certificate_file_name?: string | null;
      linked_credential_ids: string[];
    }) => {
      const { id, linked_credential_ids, ...entryData } = input;
      const { error } = await supabase
        .from('ce_entries')
        .update(entryData)
        .eq('id', id);
      if (error) throw error;

      // Replace links
      const { error: delError } = await supabase
        .from('ce_credential_links')
        .delete()
        .eq('ce_entry_id', id);
      if (delError) throw delError;

      if (linked_credential_ids.length > 0) {
        const links = linked_credential_ids.map(credential_id => ({
          ce_entry_id: id,
          credential_id,
        }));
        const { error: linkError } = await supabase
          .from('ce_credential_links')
          .insert(links);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_entries'] });
      queryClient.invalidateQueries({ queryKey: ['ce_credential_links'] });
      toast({ title: 'CE entry updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteCEEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ce_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_entries'] });
      queryClient.invalidateQueries({ queryKey: ['ce_credential_links'] });
      toast({ title: 'CE entry deleted' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const uploadCertificate = async (file: File): Promise<{ url: string; name: string }> => {
    if (!user) throw new Error('Not authenticated');
    const filePath = `${user.id}/ce-certs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('credential-documents').upload(filePath, file);
    if (error) throw error;
    return { url: filePath, name: file.name };
  };

  const isDemo = !user && useAuth().isDemo;

  // Helpers for credential-level rollups
  function getCredentialCEStats(credentialId: string) {
    const allLinks = isDemo ? demoCELinks : (linksQuery.data ?? []);
    const allEntries = isDemo ? demoCEEntries : (entriesQuery.data ?? []);
    const links = allLinks.filter(l => l.credential_id === credentialId);
    const entries = allEntries.filter(e => links.some(l => l.ce_entry_id === e.id));
    const completedHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const missingCerts = entries.filter(e => !e.certificate_file_url).length;
    return {
      linkedEntries: entries,
      linkedCount: entries.length,
      completedHours,
      missingCerts,
    };
  }

  return {
    entries: isDemo ? demoCEEntriesWithLinks : entriesWithLinks,
    links: isDemo ? demoCELinks : (linksQuery.data ?? []),
    isLoading: isDemo ? false : (entriesQuery.isLoading || linksQuery.isLoading),
    addCEEntry,
    updateCEEntry,
    deleteCEEntry,
    uploadCertificate,
    getCredentialCEStats,
  };
}
