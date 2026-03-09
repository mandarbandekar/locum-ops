import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Profession = 'vet' | 'nurse' | 'physician' | 'pharmacist' | 'pt_ot' | 'other';
export type FacilitiesCountBand = 'band_1_3' | 'band_4_8' | 'band_9_plus';
export type InvoicesPerMonthBand = 'inv_1_3' | 'inv_4_10' | 'inv_11_plus';
export type EmailTone = 'friendly' | 'neutral' | 'direct';
export type CurrentTool = 'sheets_excel' | 'calendar' | 'quickbooks' | 'wave' | 'freshbooks' | 'notes' | 'other';

export interface TermsFieldsEnabled {
  weekday_rate: boolean;
  weekend_rate: boolean;
  cancellation_policy: boolean;
  overtime_policy: boolean;
  late_payment_policy: boolean;
  special_notes: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  profession: Profession;
  work_style_label: string;
  timezone: string;
  currency: string;
  current_tools: CurrentTool[];
  facilities_count_band: FacilitiesCountBand;
  invoices_per_month_band: InvoicesPerMonthBand;
  invoice_due_default_days: number;
  invoice_prefix: string;
  email_tone: EmailTone;
  terms_fields_enabled: TermsFieldsEnabled;
  onboarding_completed_at: string | null;
  first_name: string;
  last_name: string;
  company_name: string;
  company_address: string;
  invoice_email: string | null;
  invoice_phone: string | null;
}

const DEFAULT_TERMS_FIELDS: TermsFieldsEnabled = {
  weekday_rate: true,
  weekend_rate: true,
  cancellation_policy: true,
  overtime_policy: true,
  late_payment_policy: true,
  special_notes: true,
};

export const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'user_id'> = {
  profession: 'other',
  work_style_label: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currency: 'USD',
  current_tools: [],
  facilities_count_band: 'band_1_3',
  invoices_per_month_band: 'inv_1_3',
  invoice_due_default_days: 14,
  invoice_prefix: 'INV',
  email_tone: 'neutral',
  terms_fields_enabled: DEFAULT_TERMS_FIELDS,
  onboarding_completed_at: null,
  first_name: '',
  last_name: '',
  company_name: '',
  company_address: '',
  invoice_email: null,
  invoice_phone: null,
};

interface UserProfileContextType {
  profile: UserProfile | null;
  profileLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  needsOnboarding: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

const db = (table: string) => supabase.from(table as any);

export function UserProfileProvider({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(
    isDemo
      ? {
          id: 'demo-profile',
          user_id: 'demo-user',
          ...DEFAULT_PROFILE,
          profession: 'vet',
          work_style_label: 'Independent contractor (1099)',
          onboarding_completed_at: new Date().toISOString(),
        }
      : null
  );
  const [profileLoading, setProfileLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !user) return;
    loadProfile();
  }, [isDemo, user?.id]);

  async function loadProfile() {
    try {
      const { data, error } = await db('user_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load profile:', error);
        setProfileLoading(false);
        return;
      }

      if (data) {
        const d = data as any;
        setProfile({
          id: d.id,
          user_id: d.user_id,
          profession: d.profession,
          work_style_label: d.work_style_label,
          timezone: d.timezone,
          currency: d.currency,
          current_tools: (d.current_tools as CurrentTool[]) || [],
          facilities_count_band: d.facilities_count_band,
          invoices_per_month_band: d.invoices_per_month_band,
          invoice_due_default_days: d.invoice_due_default_days,
          invoice_prefix: d.invoice_prefix,
          email_tone: d.email_tone,
          terms_fields_enabled: (d.terms_fields_enabled as TermsFieldsEnabled) || DEFAULT_TERMS_FIELDS,
          onboarding_completed_at: d.onboarding_completed_at,
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          company_name: d.company_name || '',
          company_address: d.company_address || '',
          invoice_email: d.invoice_email || null,
          invoice_phone: d.invoice_phone || null,
        });
      } else {
        const { data: newData, error: insertErr } = await db('user_profiles')
          .insert({ user_id: user!.id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
          .select()
          .single();
        if (!insertErr && newData) {
          const nd = newData as any;
          setProfile({
            id: nd.id,
            user_id: nd.user_id,
            profession: nd.profession || 'other',
            work_style_label: nd.work_style_label || '',
            timezone: nd.timezone,
            currency: nd.currency || 'USD',
            current_tools: [],
            facilities_count_band: nd.facilities_count_band || 'band_1_3',
            invoices_per_month_band: nd.invoices_per_month_band || 'inv_1_3',
            invoice_due_default_days: nd.invoice_due_default_days || 14,
            invoice_prefix: nd.invoice_prefix || 'INV',
            email_tone: nd.email_tone || 'neutral',
            terms_fields_enabled: DEFAULT_TERMS_FIELDS,
            onboarding_completed_at: null,
          });
        }
      }
    } finally {
      setProfileLoading(false);
    }
  }

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (isDemo) {
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      return;
    }
    if (!profile) return;
    const { id, user_id, ...rest } = updates as any;
    const { error } = await db('user_profiles').update(rest).eq('id', profile.id);
    if (error) { console.error('Update profile error:', error); return; }
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, [isDemo, profile]);

  const completeOnboarding = useCallback(async () => {
    const now = new Date().toISOString();
    console.log('onboarding_complete');
    await updateProfile({ onboarding_completed_at: now });
  }, [updateProfile]);

  const needsOnboarding = !profileLoading && (!profile || !profile.onboarding_completed_at);

  return (
    <UserProfileContext.Provider value={{ profile, profileLoading, updateProfile, completeOnboarding, needsOnboarding }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
