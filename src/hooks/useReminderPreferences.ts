import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = (table: string) => supabase.from(table as any);

export interface ReminderPreferences {
  id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  reminder_email: string | null;
  phone_number: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: string;
}

export interface ReminderCategorySetting {
  id: string;
  category: string;
  enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  timing_config: Record<string, boolean> | null;
}

const CATEGORIES = ['invoices', 'confirmations', 'shifts', 'credentials', 'contracts', 'outreach', 'taxes'] as const;
export type ReminderCategory = typeof CATEGORIES[number];
export { CATEGORIES };
export const ACTIVE_CATEGORIES = ['invoices', 'credentials'] as const;
export type ActiveReminderCategory = typeof ACTIVE_CATEGORIES[number];

const DEFAULT_PREFS: Omit<ReminderPreferences, 'id'> = {
  email_enabled: true,
  sms_enabled: false,
  in_app_enabled: true,
  reminder_email: null,
  phone_number: null,
  quiet_hours_start: null,
  quiet_hours_end: null,
  digest_frequency: 'none',
};

const DEFAULT_TIMING: Record<string, boolean> = {
  same_day: false,
  '1_day_before': true,
  '3_days_before': true,
  '7_days_before': false,
  weekly_digest: false,
};

export function useReminderPreferences() {
  const { user, isDemo } = useAuth();
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [categories, setCategories] = useState<ReminderCategorySetting[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    if (isDemo || !user) {
      setPrefs({ id: 'demo', ...DEFAULT_PREFS });
      setCategories(CATEGORIES.map(c => ({
        id: c,
        category: c,
        enabled: true,
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
        timing_config: { ...DEFAULT_TIMING },
      })));
      setLoading(false);
      return;
    }

    const [prefRes, catRes] = await Promise.all([
      db('reminder_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      db('reminder_category_settings').select('*').eq('user_id', user.id),
    ]);

    if (prefRes.data) {
      setPrefs(prefRes.data as any);
    } else {
      // Create default
      const { data } = await db('reminder_preferences').insert({ user_id: user.id }).select().single();
      if (data) setPrefs(data as any);
    }

    if (catRes.data && (catRes.data as any[]).length > 0) {
      setCategories(catRes.data as any[]);
    } else {
      // Seed defaults
      const rows = CATEGORIES.map(c => ({
        user_id: user.id,
        category: c,
        enabled: true,
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
        timing_config: { ...DEFAULT_TIMING },
      }));
      const { data } = await db('reminder_category_settings').insert(rows).select();
      if (data) setCategories(data as any[]);
    }

    setLoading(false);
  }, [user?.id, isDemo]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  const updatePrefs = useCallback(async (updates: Partial<ReminderPreferences>) => {
    if (isDemo || !prefs) return;
    const { error } = await db('reminder_preferences').update(updates as any).eq('id', prefs.id);
    if (!error) setPrefs(prev => prev ? { ...prev, ...updates } : prev);
  }, [prefs, isDemo]);

  const updateCategory = useCallback(async (category: string, updates: Partial<ReminderCategorySetting>) => {
    if (isDemo) return;
    const existing = categories.find(c => c.category === category);
    if (!existing) return;
    const { error } = await db('reminder_category_settings').update(updates as any).eq('id', existing.id);
    if (!error) {
      setCategories(prev => prev.map(c => c.category === category ? { ...c, ...updates } : c));
    }
  }, [categories, isDemo]);

  return { prefs, categories, loading, updatePrefs, updateCategory, reload: loadPrefs };
}
