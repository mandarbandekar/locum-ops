import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  buildStrategies,
  getAnnualizedIncome,
  DEFAULT_INPUTS,
  type StrategyInputs,
  type StrategyResult,
} from '@/lib/taxStrategies';
import type { FilingStatus } from '@/lib/taxConstants2026';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { STATE_TAX_DATA } from '@/lib/stateTaxData';
import { toast } from 'sonner';

const db = (table: string) => supabase.from(table as any);

function getTopMarginalStateRate(stateCode: string): number {
  const state = STATE_TAX_DATA[stateCode];
  if (!state || state.type === 'none') return 0;
  if (state.type === 'flat') return state.rate ?? 0;
  const allBrackets = Object.values(state.brackets || {}).flat();
  return allBrackets.length > 0 ? Math.max(...allBrackets.map(b => b.rate)) : 0.05;
}

interface UseTaxStrategiesReturn {
  strategies: StrategyResult[];
  totalSavings: number;
  annualizedIncome: number;
  inputs: StrategyInputs;
  updateInputs: (patch: Partial<StrategyInputs>) => Promise<void>;
  dismissStrategy: (strategyId: string) => Promise<void>;
  restoreStrategy: (strategyId: string) => Promise<void>;
  loading: boolean;
  earnedIncome: number;
  entityType: string;
}

export function useTaxStrategies(): UseTaxStrategiesReturn {
  const { user, isDemo } = useAuth();
  const { shifts, invoices, facilities } = useData();
  const { profile: taxProfile } = useTaxIntelligence();
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

  // Compute YTD earned income for gating
  const earnedIncome = useMemo(() => {
    const year = new Date().getFullYear();
    return invoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === year)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [invoices]);

  // Pull filing status and state from tax profile instead of hardcoding
  const filingStatus: FilingStatus = (taxProfile?.filing_status as FilingStatus) || 'single';
  const stateRate = taxProfile?.state_code ? getTopMarginalStateRate(taxProfile.state_code) : 0.05;
  const entityType = taxProfile?.entity_type || 'sole_prop';

  const scorpSalary = taxProfile?.scorp_salary || 0;

  const strategies = useMemo(() => {
    return buildStrategies(annualizedIncome, inputs, filingStatus, stateRate, facilityCount, entityType, scorpSalary);
  }, [annualizedIncome, inputs, filingStatus, stateRate, facilityCount, entityType, scorpSalary]);

  // If user is already S-Corp, filter out the scorp strategy
  const filteredStrategies = useMemo(() => {
    if (entityType === 'scorp') {
      return strategies.filter(s => s.id !== 'scorp');
    }
    return strategies;
  }, [strategies, entityType]);

  const totalSavings = useMemo(() => {
    return filteredStrategies
      .filter(s => s.eligible && !s.dismissed)
      .reduce((sum, s) => sum + s.estimatedSavings, 0);
  }, [filteredStrategies]);

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
    strategies: filteredStrategies,
    totalSavings,
    annualizedIncome,
    inputs,
    updateInputs,
    dismissStrategy,
    restoreStrategy,
    loading,
    earnedIncome,
    entityType,
  };
}
