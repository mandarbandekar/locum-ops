import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { calculateTax } from '@/components/tax-intelligence/TaxDashboard';
import { getMarginalRate, type FilingStatus } from '@/lib/taxConstants2026';

/**
 * Compute the effective set-aside rate from a tax profile and gross income.
 * Uses marginal federal rate + state effective + SE rate (1099 only).
 * Clamped between 10% and 45%.
 */
export function computeEffectiveSetAsideRate(
  profile: TaxIntelligenceProfile,
  projectedAnnualIncome: number,
): number {
  if (projectedAnnualIncome <= 0) return 0.25;
  const result = calculateTax(projectedAnnualIncome, profile);
  const fs = (profile.filing_status || 'single') as FilingStatus;
  const marginalFed = getMarginalRate(result.federalTaxableIncome ?? 0, fs);
  const stateEffective = projectedAnnualIncome > 0
    ? (result.personalStateTax ?? result.stateTax) / projectedAnnualIncome
    : 0;
  const seRate = profile.entity_type === 'scorp' ? 0 : 0.1413;
  const raw = marginalFed + stateEffective + seRate;
  return Math.min(0.45, Math.max(0.10, raw));
}

export interface ShiftTaxNudgeResult {
  setAsideAmount: number;
  netAfterSetAside: number;
  effectiveRatePct: number;
  breakdown: { federal: number; state: number; se: number };
}

/**
 * Calculate set-aside amount for a single shift using marginal rates.
 */
export function getShiftTaxNudge(
  shiftIncome: number,
  effectiveRate: number,
  breakdown?: { federal: number; state: number; se: number },
): ShiftTaxNudgeResult {
  const cappedRate = Math.min(effectiveRate, 0.45);
  const setAsideAmount = Math.round(shiftIncome * cappedRate);
  return {
    setAsideAmount,
    netAfterSetAside: shiftIncome - setAsideAmount,
    effectiveRatePct: Math.round(cappedRate * 100),
    breakdown: breakdown ?? { federal: effectiveRate, state: 0, se: 0 },
  };
}
