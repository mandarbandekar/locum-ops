import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { calculateTax } from '@/components/tax-intelligence/TaxDashboard';

/**
 * Compute the effective set-aside rate from a tax profile and gross income.
 * Clamped between 10% and 45%.
 */
export function computeEffectiveSetAsideRate(
  profile: TaxIntelligenceProfile,
  projectedAnnualIncome: number,
): number {
  if (projectedAnnualIncome <= 0) return 0.25; // default 25% if no income yet
  const result = calculateTax(projectedAnnualIncome, profile);
  const raw = result.totalAnnualTax / projectedAnnualIncome;
  return Math.min(0.45, Math.max(0.10, raw));
}

export interface ShiftTaxNudgeResult {
  setAsideAmount: number;
  netAfterSetAside: number;
  effectiveRatePct: number;
}

/**
 * Calculate set-aside amount for a single shift.
 * All values rounded to nearest dollar.
 */
export function getShiftTaxNudge(
  shiftIncome: number,
  effectiveRate: number,
): ShiftTaxNudgeResult {
  const setAsideAmount = Math.round(shiftIncome * effectiveRate);
  return {
    setAsideAmount,
    netAfterSetAside: shiftIncome - setAsideAmount,
    effectiveRatePct: Math.round(effectiveRate * 100),
  };
}
