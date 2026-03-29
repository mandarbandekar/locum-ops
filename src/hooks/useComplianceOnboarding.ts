import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ComplianceOnboardingState {
  id: string;
  user_id: string;
  has_seen_welcome: boolean;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  selected_credential_types: string[];
  first_credential_added: boolean;
  first_document_uploaded: boolean;
  first_ce_entry_added: boolean;
}

export function useComplianceOnboarding() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ['compliance_onboarding', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_onboarding_state')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as ComplianceOnboardingState | null;
    },
    enabled: !!user && !isDemo,
  });

  const upsertState = useMutation({
    mutationFn: async (updates: Partial<Omit<ComplianceOnboardingState, 'id' | 'user_id'>>) => {
      const { data: existing } = await supabase
        .from('compliance_onboarding_state')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('compliance_onboarding_state')
          .update(updates as any)
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('compliance_onboarding_state')
          .insert({ user_id: user!.id, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance_onboarding', user?.id] });
    },
  });

  const state = stateQuery.data;

  const needsOnboarding = !isDemo && !state?.onboarding_completed_at && !state?.onboarding_skipped_at;
  const showWelcome = !isDemo && !state?.has_seen_welcome && needsOnboarding;

  const markWelcomeSeen = () => upsertState.mutateAsync({ has_seen_welcome: true, onboarding_started_at: new Date().toISOString() });
  const markSkipped = () => upsertState.mutateAsync({ onboarding_skipped_at: new Date().toISOString() });
  const markCompleted = () => upsertState.mutateAsync({ onboarding_completed_at: new Date().toISOString() });
  const setSelectedTypes = (types: string[]) => upsertState.mutateAsync({ selected_credential_types: types });
  const markCredentialAdded = () => upsertState.mutateAsync({ first_credential_added: true });
  const markDocumentUploaded = () => upsertState.mutateAsync({ first_document_uploaded: true });
  const markCEAdded = () => upsertState.mutateAsync({ first_ce_entry_added: true });

  // Checklist progress
  const checklistItems = [
    { key: 'license', label: 'Add your primary veterinary license', done: false, action: 'add-credential' },
    { key: 'dea', label: 'Add DEA registration', done: false, action: 'add-credential' },
    { key: 'insurance', label: 'Upload malpractice insurance', done: false, action: 'upload-document' },
    { key: 'ce', label: 'Upload at least 1 CE certificate', done: state?.first_ce_entry_added || false, action: 'add-ce' },
    { key: 'renewals', label: 'Review upcoming renewal dates', done: false, action: 'review-renewals' },
  ];

  return {
    state,
    isLoading: stateQuery.isLoading,
    needsOnboarding,
    showWelcome,
    checklistItems,
    markWelcomeSeen,
    markSkipped,
    markCompleted,
    setSelectedTypes,
    markCredentialAdded,
    markDocumentUploaded,
    markCEAdded,
    upsertState,
  };
}
