import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import {
  buildStrategies,
  getAnnualizedIncome,
  DEFAULT_INPUTS,
  type StrategyInputs,
  type StrategyResult,
} from '@/lib/taxStrategies';
import type { FilingStatus } from '@/lib/taxConstants2026';
import { STATE_TAX_DATA } from '@/lib/stateTaxData';
import { toast } from 'sonner';

const db = (table: string) => supabase.from(table as any);

interface UseTaxStrategiesReturn {
  strategies: StrategyResult[];
  totalSavings: number;
  annualizedIncome: number;
  inputs: StrategyInputs;
  updateInputs: (patch: Partial<StrategyInputs>) => Promise<void>;
  dismissStrategy: (strategyId: string) => Promise<void>;
  restoreStrategy: (strategyId: string) => Promise<void>;
  loading: boolean;
  paidShiftCount: number;
  entityType: string;
}

export function useTaxStrategies(): UseTaxStrategiesReturn {
  const { user, isDemo } = useAuth();
  const { shifts, invoices, facilities } = useData();
  const { profile } = useTaxIntelligence();
  const [inputs, setInputs] = useState<StrategyInputs>(DEFAULT_INPUTS);
  const [loading, setLoading] = useState(true);

  // Load inputs from database
  useEffect(() => {
    if (isDemo || !user) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await db('tax_strategy_inputs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setInputs({
          deduction_checklist: (data as any).deduction_checklist || {},
          home_office_sqft: (data as any).home_office_sqft || 0,
          weekly_business_miles: (data as any).weekly_business_miles || 0,
          retirement_vehicle: (data as any).retirement_vehicle || 'sep_ira',
          retirement_contribution_slider: (data as any).retirement_contribution_slider || 0,
          scorp_salary_slider: (data as any).scorp_salary_slider || 110000,
          prior_year_tax: (data as any).prior_year_tax || 0,
          dismissed_strategies: (data as any).dismissed_strategies || [],
        });
      }
      setLoading(false);
    })();
  }, [user?.id, isDemo]);

  const annualizedIncome = useMemo(() => getAnnualizedIncome(shifts, invoices), [shifts, invoices]);
  const facilityCount = facilities.length;

  const paidShiftCount = useMemo(() => {
    return shifts.filter(s => new Date(s.end_datetime) < new Date()).length;
  }, [shifts]);

  const entityType = profile?.entity_type || 'sole_prop';
  const filingStatus = (profile?.filing_status || 'single') as FilingStatus;
  const stateRate = (() => {
    if (!profile?.state_code) return 0.05;
    const entry = STATE_TAX_DATA[profile.state_code];
    if (!entry) return 0.05;
    if (entry.rate) return entry.rate;
    // For bracket states, use the top bracket rate
    const brackets = entry.brackets?.single;
    if (brackets && brackets.length > 0) return brackets[brackets.length - 1].rate;
    return 0.05;
  })();

  const strategies = useMemo(() => {
    return buildStrategies(annualizedIncome, inputs, filingStatus, stateRate, facilityCount, entityType);
  }, [annualizedIncome, inputs, facilityCount, filingStatus, stateRate, entityType]);

  const totalSavings = useMemo(() => {
    return strategies
      .filter(s => s.eligible && !s.dismissed)
      .reduce((sum, s) => sum + s.estimatedSavings, 0);
  }, [strategies]);

  const persistInputs = useCallback(async (newInputs: StrategyInputs) => {
    if (isDemo || !user) return;
    const { error } = await db('tax_strategy_inputs')
      .upsert({
        user_id: user.id,
        deduction_checklist: newInputs.deduction_checklist,
        home_office_sqft: newInputs.home_office_sqft,
        weekly_business_miles: newInputs.weekly_business_miles,
        retirement_vehicle: newInputs.retirement_vehicle,
        retirement_contribution_slider: newInputs.retirement_contribution_slider,
        scorp_salary_slider: newInputs.scorp_salary_slider,
        prior_year_tax: newInputs.prior_year_tax,
        dismissed_strategies: newInputs.dismissed_strategies,
      } as any, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save tax strategy inputs:', error);
    }
  }, [user?.id, isDemo]);

  const updateInputs = useCallback(async (patch: Partial<StrategyInputs>) => {
    const updated = { ...inputs, ...patch };
    setInputs(updated);
    await persistInputs(updated);
  }, [inputs, persistInputs]);

  const dismissStrategy = useCallback(async (strategyId: string) => {
    const updated = {
      ...inputs,
      dismissed_strategies: [...inputs.dismissed_strategies, strategyId],
    };
    setInputs(updated);
    await persistInputs(updated);
    toast.success('Strategy dismissed');
  }, [inputs, persistInputs]);

  const restoreStrategy = useCallback(async (strategyId: string) => {
    const updated = {
      ...inputs,
      dismissed_strategies: inputs.dismissed_strategies.filter(id => id !== strategyId),
    };
    setInputs(updated);
    await persistInputs(updated);
    toast.success('Strategy restored');
  }, [inputs, persistInputs]);

  return {
    strategies,
    totalSavings,
    annualizedIncome,
    inputs,
    updateInputs,
    dismissStrategy,
    restoreStrategy,
    loading,
    paidShiftCount,
    entityType,
  };
}
