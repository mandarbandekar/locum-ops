import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaxIntelligenceProfile {
  id: string;
  user_id: string;
  entity_type: string;
  filing_status: string;
  state_code: string;
  other_w2_income: number;
  retirement_type: string;
  retirement_contribution: number;
  expense_tracking_level: string;
  ytd_expenses_estimate: number;
  scorp_salary: number;
  safe_harbor_method: string;
  prior_year_tax_paid: number;
  setup_completed_at: string | null;
  pte_elected: boolean;
  spouse_w2_income: number;
  spouse_has_se_income: boolean;
  spouse_se_net_income: number;
  prior_year_total_income: number;
  // V1 fields
  annual_relief_income: number;
  extra_withholding: number;
  pay_periods_per_year: number;
  annual_business_expenses: number;
  typical_days_per_week: number;
  // Multi-state
  work_states: WorkStateAllocation[];
  // Safe harbor (4B)
  prior_year_agi: number;
  q1_estimated_payment: number;
  q2_estimated_payment: number;
  q3_estimated_payment: number;
  q4_estimated_payment: number;
  income_projection_method: string;
}

export interface WorkStateAllocation {
  state_code: string;
  income_pct: number;
}

const db = (table: string) => supabase.from(table as any);

const DEMO_PROFILE: TaxIntelligenceProfile = {
  id: 'demo-tip',
  user_id: 'demo',
  entity_type: '1099',
  filing_status: 'single',
  state_code: 'OR',
  other_w2_income: 0,
  retirement_type: 'sep_ira',
  retirement_contribution: 6000,
  expense_tracking_level: 'careful',
  ytd_expenses_estimate: 9500,
  scorp_salary: 0,
  safe_harbor_method: '90_percent',
  prior_year_tax_paid: 0,
  setup_completed_at: '2026-01-15T00:00:00Z',
  pte_elected: false,
  spouse_w2_income: 0,
  spouse_has_se_income: false,
  spouse_se_net_income: 0,
  prior_year_total_income: 120000,
  // V1
  annual_relief_income: 120000,
  extra_withholding: 0,
  pay_periods_per_year: 24,
  annual_business_expenses: 9500,
  typical_days_per_week: 3,
  work_states: [],
  prior_year_agi: 0,
  q1_estimated_payment: 0,
  q2_estimated_payment: 0,
  q3_estimated_payment: 0,
  q4_estimated_payment: 0,
  income_projection_method: 'booked_plus_run_rate',
};

export function useTaxIntelligence() {
  const { user, isDemo } = useAuth();
  const [profile, setProfile] = useState<TaxIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapRow = (d: any): TaxIntelligenceProfile => ({
    id: d.id,
    user_id: d.user_id,
    entity_type: d.entity_type,
    filing_status: d.filing_status,
    state_code: d.state_code,
    other_w2_income: Number(d.other_w2_income),
    retirement_type: d.retirement_type,
    retirement_contribution: Number(d.retirement_contribution),
    expense_tracking_level: d.expense_tracking_level,
    ytd_expenses_estimate: Number(d.ytd_expenses_estimate),
    scorp_salary: Number(d.scorp_salary),
    safe_harbor_method: d.safe_harbor_method,
    prior_year_tax_paid: Number(d.prior_year_tax_paid),
    setup_completed_at: d.setup_completed_at,
    pte_elected: Boolean(d.pte_elected),
    spouse_w2_income: Number(d.spouse_w2_income ?? 0),
    spouse_has_se_income: Boolean(d.spouse_has_se_income),
    spouse_se_net_income: Number(d.spouse_se_net_income ?? 0),
    prior_year_total_income: Number(d.prior_year_total_income ?? 0),
    // V1
    annual_relief_income: Number(d.annual_relief_income ?? 0),
    extra_withholding: Number(d.extra_withholding ?? 0),
    pay_periods_per_year: Number(d.pay_periods_per_year ?? 24),
    annual_business_expenses: Number(d.annual_business_expenses ?? 0),
    typical_days_per_week: Number(d.typical_days_per_week ?? 3),
    work_states: Array.isArray(d.work_states)
      ? d.work_states
          .filter((w: any) => w && typeof w.state_code === 'string')
          .map((w: any) => ({ state_code: String(w.state_code), income_pct: Number(w.income_pct) || 0 }))
      : [],
    prior_year_agi: Number(d.prior_year_agi ?? 0),
    q1_estimated_payment: Number(d.q1_estimated_payment ?? 0),
    q2_estimated_payment: Number(d.q2_estimated_payment ?? 0),
    q3_estimated_payment: Number(d.q3_estimated_payment ?? 0),
    q4_estimated_payment: Number(d.q4_estimated_payment ?? 0),
    income_projection_method: String(d.income_projection_method ?? 'booked_plus_run_rate'),
  });

  const load = useCallback(async () => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await db('tax_intelligence_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setProfile(mapRow(data));
    } catch (e) {
      console.error('Failed to load tax intelligence profile', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = useCallback(async (data: Partial<TaxIntelligenceProfile>) => {
    if (isDemo) {
      setProfile(prev => prev ? { ...prev, ...data } : { ...DEMO_PROFILE, ...data });
      return;
    }
    if (!user) return;
    if (profile?.id) {
      const { data: updated } = await db('tax_intelligence_profiles')
        .update(data as any)
        .eq('id', profile.id)
        .select()
        .single();
      if (updated) setProfile(prev => prev ? { ...prev, ...mapRow(updated) } : null);
    } else {
      const { data: created } = await db('tax_intelligence_profiles')
        .insert({ user_id: user.id, ...data, setup_completed_at: new Date().toISOString() } as any)
        .select()
        .single();
      if (created) setProfile(mapRow(created));
    }
  }, [user?.id, profile?.id, isDemo]);

  const hasProfile = !!(profile?.setup_completed_at);

  return { profile, loading, saveProfile, hasProfile, reload: load };
}
