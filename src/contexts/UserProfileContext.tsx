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
  home_address: string;
  completed_tours: string[];
  has_seen_welcome: boolean;
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
  home_address: '',
  completed_tours: [],
  has_seen_welcome: false,
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
          first_name: 'Sarah',
          last_name: 'Mitchell',
          company_name: 'Mitchell Veterinary Relief LLC',
          company_address: '2480 NW Thurman St, Suite 3\nPortland, OR 97210',
          invoice_email: 'sarah@mitchellvetrelief.com',
          invoice_phone: '503-555-0147',
          home_address: '1234 Elm Street\nPortland, OR 97201',
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
        let firstName = d.first_name || '';
        let lastName = d.last_name || '';
        let profession = d.profession || 'other';

        // If the trigger created a bare row, backfill from auth metadata
        if (!firstName && !lastName) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const meta = authUser?.user_metadata || {};
          firstName = meta.first_name || '';
          lastName = meta.last_name || '';
          // Google OAuth provides full_name/name instead of first/last
          if (!firstName && !lastName && (meta.full_name || meta.name)) {
            const parts = (meta.full_name || meta.name || '').split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }
          profession = meta.profession || profession;
          if (firstName || lastName) {
            await db('user_profiles').update({
              first_name: firstName,
              last_name: lastName,
              profession,
              invoice_email: d.invoice_email || authUser?.email || null,
            }).eq('id', d.id);
          }
        }

        setProfile({
          id: d.id,
          user_id: d.user_id,
          profession,
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
          first_name: firstName,
          last_name: lastName,
          company_name: d.company_name || '',
          company_address: d.company_address || '',
          invoice_email: d.invoice_email || null,
          invoice_phone: d.invoice_phone || null,
          home_address: d.home_address || '',
          completed_tours: (d.completed_tours as string[]) || [],
          has_seen_welcome: !!d.has_seen_welcome,
        });
      } else {
        // Pull signup metadata from auth user to pre-populate profile
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const meta = authUser?.user_metadata || {};
        let gFirst = meta.first_name || '';
        let gLast = meta.last_name || '';
        // Google OAuth provides full_name/name instead of first/last
        if (!gFirst && !gLast && (meta.full_name || meta.name)) {
          const parts = (meta.full_name || meta.name || '').split(' ');
          gFirst = parts[0] || '';
          gLast = parts.slice(1).join(' ') || '';
        }
        const insertData: any = {
          user_id: user!.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          first_name: gFirst,
          last_name: gLast,
          company_name: meta.company || '',
          profession: meta.profession || 'other',
          invoice_email: authUser?.email || null,
        };

        const { data: newData, error: insertErr } = await db('user_profiles')
          .insert(insertData)
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
            first_name: nd.first_name || '',
            last_name: nd.last_name || '',
            company_name: nd.company_name || '',
            company_address: nd.company_address || '',
            invoice_email: nd.invoice_email || null,
            invoice_phone: nd.invoice_phone || null,
            home_address: nd.home_address || '',
            completed_tours: [],
            has_seen_welcome: false,
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
