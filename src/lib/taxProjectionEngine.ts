/**
 * Tax Projection Engine
 * 
 * Replaces the simple "YTD paid + 90-day projected" income calculation
 * with full-year projections using three methods:
 * 1. Annualized Actual — extrapolates YTD pace to full year
 * 2. Annual Goal — user-entered income target
 * 3. Safe Harbor — based on prior year tax liability
 */

import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import { calculateTax, type FullTaxResult } from '@/components/tax-intelligence/TaxDashboard';

// ── Constants ───────────────────────────────────────────────
export const PROJECTION_CONFIG = {
  /** Minimum months of data before annualizing YTD income */
  minMonthsForAnnualization: 2,
};

// ── Types ───────────────────────────────────────────────────
export interface ProjectionMeta {
  method: 'annualized_actual' | 'annual_projection' | 'safe_harbor';
  annualIncome: number | null;
  bypassCalculation: boolean;
  earlyYearFallback?: boolean;
  note?: string;
  ytdEarned?: number;
  bookedUpcoming?: number;
  annualizedPace?: number;
  yearFraction?: number;
}

export interface EstimateResult {
  method: string;
  label: string;
  annualIncome: number;
  annualProjectedTax: number;
  quarterlyPayment: number;
  federalTax: number;
  stateTax: number;
  seTax: number;
  marginalRate: number;
  effectiveRate: number;
  penaltyProof: boolean;
  taxResult: FullTaxResult;
}

export interface FullQuarterlyEstimate {
  activeMethod: string;
  activeEstimate: EstimateResult | null;
  recommended: string;
  methods: {
    safeHarbor: EstimateResult | null;
    annualGoal: EstimateResult | null;
    annualizedActual: EstimateResult | null;
  };
  spread: number;
  spreadPercent: number;
  spreadSeverity: 'low' | 'medium' | 'high';
  projectionMeta: ProjectionMeta;
}

// ── Core projection logic ───────────────────────────────────

function getYearFraction(): number {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - startOfYear.getTime()) / 86400000));
  return daysElapsed / 365;
}

export function assembleProjectedAnnualIncome(
  profile: TaxIntelligenceProfile,
  earnedYTD: number,
  upcomingShiftIncome: number,
): ProjectionMeta {
  const method = (profile.projection_method || 'annualized_actual') as ProjectionMeta['method'];

  switch (method) {
    case 'safe_harbor': {
      return { method: 'safe_harbor', annualIncome: null, bypassCalculation: true };
    }

    case 'annual_projection': {
      const goal = profile.annual_income_goal || 0;
      if (goal <= 0) {
        return getAnnualizedActual(profile, earnedYTD, upcomingShiftIncome);
      }
      return {
        method: 'annual_projection',
        annualIncome: goal,
        bypassCalculation: false,
      };
    }

    case 'annualized_actual':
    default: {
      return getAnnualizedActual(profile, earnedYTD, upcomingShiftIncome);
    }
  }
}

function getAnnualizedActual(
  profile: TaxIntelligenceProfile,
  earnedYTD: number,
  upcomingShiftIncome: number,
): ProjectionMeta {
  const yearFraction = getYearFraction();
  const minFraction = PROJECTION_CONFIG.minMonthsForAnnualization / 12;

  // Early year fallback (before ~March 1)
  if (yearFraction < minFraction) {
    const fallbackIncome =
      (profile.annual_income_goal && profile.annual_income_goal > 0 ? profile.annual_income_goal : null) ||
      (profile.prior_year_total_income && profile.prior_year_total_income > 0 ? profile.prior_year_total_income : null) ||
      ((earnedYTD + upcomingShiftIncome) * (1 / Math.max(yearFraction, 0.05)));

    return {
      method: 'annualized_actual',
      annualIncome: Math.round(fallbackIncome),
      bypassCalculation: false,
      earlyYearFallback: true,
      note: 'Estimated from limited data — will improve as you log more shifts',
      ytdEarned: Math.round(earnedYTD),
      bookedUpcoming: Math.round(upcomingShiftIncome),
      yearFraction,
    };
  }

  // Full annualization
  const annualizedPace = earnedYTD / yearFraction;
  const remainingFraction = 1 - yearFraction;
  const projectedRemainder = Math.max(upcomingShiftIncome, annualizedPace * remainingFraction);
  const fullYearProjection = earnedYTD + projectedRemainder;

  return {
    method: 'annualized_actual',
    annualIncome: Math.round(fullYearProjection),
    bypassCalculation: false,
    ytdEarned: Math.round(earnedYTD),
    bookedUpcoming: Math.round(upcomingShiftIncome),
    annualizedPace: Math.round(annualizedPace),
    yearFraction,
  };
}

// ── Safe Harbor Estimate ────────────────────────────────────

export function getSafeHarborEstimate(profile: TaxIntelligenceProfile): EstimateResult | null {
  const priorTax = profile.prior_year_tax_paid || 0;
  if (priorTax <= 0) return null;

  // 110% method for high earners (>$150k AGI), else 100%
  const multiplier = profile.safe_harbor_method === '110_percent' ? 1.1 : 1.0;
  const annualPayment = Math.round(priorTax * multiplier);
  const quarterlyPayment = Math.round(annualPayment / 4);

  return {
    method: 'safe_harbor',
    label: 'Safe harbor',
    annualIncome: 0,
    annualProjectedTax: annualPayment,
    quarterlyPayment,
    federalTax: annualPayment,
    stateTax: 0,
    seTax: 0,
    marginalRate: 0,
    effectiveRate: 0,
    penaltyProof: true,
    taxResult: {
      grossIncome: 0, expenses: 0, netIncome: 0,
      seTax: 0, seDeduction: 0, federalTax: annualPayment,
      stateTax: 0, personalStateTax: 0,
      totalAnnualTax: annualPayment, quarterlyPayment,
      effectiveRate: 0, marginalRate: 0,
      federalTaxableIncome: 0, agi: 0,
    },
  };
}

// ── Build Estimate Helper ───────────────────────────────────

function buildEstimate(
  method: string,
  annualIncome: number,
  profile: TaxIntelligenceProfile,
  label: string,
  expenseOverride?: number,
): EstimateResult {
  const taxResult = calculateTax(annualIncome, profile, expenseOverride);

  return {
    method,
    label,
    annualIncome: Math.round(annualIncome),
    annualProjectedTax: Math.round(taxResult.totalAnnualTax),
    quarterlyPayment: Math.round(taxResult.quarterlyPayment),
    federalTax: Math.round(taxResult.federalTax),
    stateTax: Math.round(taxResult.personalStateTax),
    seTax: Math.round(taxResult.seTax || 0),
    marginalRate: taxResult.marginalRate,
    effectiveRate: taxResult.effectiveRate,
    penaltyProof: method === 'safe_harbor',
    taxResult,
  };
}

// ── Full Quarterly Estimate Orchestrator ─────────────────────

export function getFullQuarterlyEstimate(
  profile: TaxIntelligenceProfile,
  earnedYTD: number,
  upcomingShiftIncome: number,
  expenseOverride?: number,
): FullQuarterlyEstimate {
  // Method 1: Safe harbor
  const safeHarbor = getSafeHarborEstimate(profile);

  // Method 2: Annual goal
  const annualGoalIncome = profile.annual_income_goal || 0;
  const annualGoal = annualGoalIncome > 0
    ? buildEstimate('annual_projection', annualGoalIncome, profile, 'Annual goal', expenseOverride)
    : null;

  // Method 3: Annualized actual
  const actualProjection = assembleProjectedAnnualIncome(profile, earnedYTD, upcomingShiftIncome);
  const annualizedActual = actualProjection.annualIncome && actualProjection.annualIncome > 0
    ? buildEstimate('annualized_actual', actualProjection.annualIncome, profile, 'Current pace', expenseOverride)
    : null;

  // Determine active method
  const userMethod = profile.projection_method || 'annualized_actual';
  const recommended = safeHarbor ? 'safe_harbor'
    : annualGoal ? 'annual_projection'
    : 'annualized_actual';

  const activeMethod = userMethod;
  const activeEstimate =
    activeMethod === 'safe_harbor' && safeHarbor ? safeHarbor :
    activeMethod === 'annual_projection' && annualGoal ? annualGoal :
    annualizedActual || annualGoal || safeHarbor;

  // Calculate spread
  const availableAmounts = [safeHarbor, annualGoal, annualizedActual]
    .filter((e): e is EstimateResult => e !== null)
    .map(e => e.quarterlyPayment);

  const spread = availableAmounts.length > 1
    ? Math.max(...availableAmounts) - Math.min(...availableAmounts)
    : 0;

  const spreadPercent = activeEstimate && activeEstimate.quarterlyPayment > 0
    ? Math.round((spread / activeEstimate.quarterlyPayment) * 100)
    : 0;

  return {
    activeMethod,
    activeEstimate,
    recommended,
    methods: { safeHarbor, annualGoal, annualizedActual },
    spread,
    spreadPercent,
    spreadSeverity: spreadPercent < 10 ? 'low' : spreadPercent < 25 ? 'medium' : 'high',
    projectionMeta: actualProjection,
  };
}

// ── Method Labels ───────────────────────────────────────────

export const PROJECTION_METHOD_LABELS: Record<string, string> = {
  annualized_actual: 'Current pace',
  annual_projection: 'Annual goal',
  safe_harbor: 'Safe harbor',
};
