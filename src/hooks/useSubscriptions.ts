import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  category: string;
  renewal_date: string | null;
  billing_frequency: string;
  cost: number | null;
  currency: string | null;
  status: string;
  website_url: string | null;
  notes: string | null;
  auto_renew: boolean | null;
  used_for: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const SUBSCRIPTION_CATEGORIES = [
  { value: 'reference_tool', label: 'Reference Tool' },
  { value: 'membership', label: 'Membership' },
  { value: 'ce_platform', label: 'CE Platform' },
  { value: 'insurance_liability', label: 'Insurance / Liability' },
  { value: 'licensing_board', label: 'Licensing / Board-Related' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
];

export const BILLING_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
];

export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'due_soon', label: 'Due Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'canceled', label: 'Canceled' },
];

export const USED_FOR_OPTIONS = [
  { value: 'relief_work', label: 'Relief Work' },
  { value: 'ce', label: 'CE' },
  { value: 'general_reference', label: 'General Reference' },
  { value: 'urgent_care', label: 'Urgent Care' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'other', label: 'Other' },
];

const DUE_SOON_DAYS = 30;

export function computeStatus(renewalDate: string | null, manualStatus: string): string {
  if (manualStatus === 'canceled') return 'canceled';
  if (!renewalDate) return manualStatus;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate + 'T00:00:00');

  if (renewal < now) return 'expired';

  const diffMs = renewal.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= DUE_SOON_DAYS) return 'due_soon';

  return 'active';
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('required_subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true, nullsFirst: false });

    if (error) {
      toast.error('Failed to load subscriptions');
      console.error(error);
    } else {
      // Compute status based on renewal_date
      const enriched = (data || []).map((s: any) => ({
        ...s,
        status: computeStatus(s.renewal_date, s.status),
      }));
      setSubscriptions(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const addSubscription = async (sub: SubscriptionInsert) => {
    if (!user) return;
    const { error } = await supabase.from('required_subscriptions').insert({
      ...sub,
      status: computeStatus(sub.renewal_date, sub.status),
    });
    if (error) {
      toast.error('Failed to add subscription');
      console.error(error);
    } else {
      toast.success('Subscription added');
      fetchSubscriptions();
    }
  };

  const updateSubscription = async (id: string, updates: Partial<SubscriptionInsert>) => {
    if (!user) return;
    const status = updates.renewal_date !== undefined || updates.status !== undefined
      ? computeStatus(updates.renewal_date ?? null, updates.status ?? 'active')
      : undefined;
    const { error } = await supabase
      .from('required_subscriptions')
      .update({ ...updates, ...(status ? { status } : {}) })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update subscription');
      console.error(error);
    } else {
      toast.success('Subscription updated');
      fetchSubscriptions();
    }
  };

  const archiveSubscription = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('required_subscriptions')
      .update({ archived_at: new Date().toISOString(), status: 'canceled' })
      .eq('id', id);
    if (error) {
      toast.error('Failed to archive subscription');
      console.error(error);
    } else {
      toast.success('Subscription archived');
      fetchSubscriptions();
    }
  };

  const activeSubscriptions = subscriptions.filter(s => !s.archived_at);
  const activeCounts = {
    active: activeSubscriptions.filter(s => s.status === 'active').length,
    dueSoon: activeSubscriptions.filter(s => s.status === 'due_soon').length,
    expired: activeSubscriptions.filter(s => s.status === 'expired').length,
  };

  return {
    subscriptions,
    activeSubscriptions,
    activeCounts,
    loading,
    addSubscription,
    updateSubscription,
    archiveSubscription,
    refetch: fetchSubscriptions,
  };
}
