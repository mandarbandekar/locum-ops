import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CredentialPortal {
  id: string;
  credential_id: string;
  user_id: string;
  renewal_website_url: string | null;
  renewal_username: string | null;
  renewal_password_encrypted: string | null;
  renewal_portal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCredentialPortal(credentialId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const portalQuery = useQuery({
    queryKey: ['credential_portal', credentialId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('credential_renewal_portals')
        .select('*')
        .eq('credential_id', credentialId!)
        .maybeSingle();
      if (error) throw error;
      return data as CredentialPortal | null;
    },
    enabled: !!user && !!credentialId,
  });

  const upsertPortal = useMutation({
    mutationFn: async (portal: {
      renewal_website_url?: string | null;
      renewal_username?: string | null;
      renewal_password_encrypted?: string | null;
      renewal_portal_notes?: string | null;
    }) => {
      if (!credentialId || !user) throw new Error('Missing credential or user');

      // Simple base64 encoding for the password (not true encryption, but obscures at rest)
      const payload: any = {
        credential_id: credentialId,
        user_id: user.id,
        renewal_website_url: portal.renewal_website_url || null,
        renewal_username: portal.renewal_username || null,
        renewal_password_encrypted: portal.renewal_password_encrypted
          ? btoa(portal.renewal_password_encrypted)
          : null,
        renewal_portal_notes: portal.renewal_portal_notes || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('credential_renewal_portals' as any)
        .upsert(payload, { onConflict: 'credential_id' })
        .select()
        .single();
      if (error) throw error;
      return data as CredentialPortal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential_portal', credentialId] });
      toast({ title: 'Renewal portal saved' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  // Decode password for display
  const decryptedPassword = portalQuery.data?.renewal_password_encrypted
    ? (() => { try { return atob(portalQuery.data.renewal_password_encrypted); } catch { return ''; } })()
    : null;

  return {
    portal: portalQuery.data ?? null,
    isLoading: portalQuery.isLoading,
    decryptedPassword,
    upsertPortal,
  };
}
