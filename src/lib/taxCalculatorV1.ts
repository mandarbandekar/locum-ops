/**
 * Tax Calculator V1 — The single source of all tax math.
 * Two paths: 1099/LLC sole proprietor and S-Corp.
 * Nothing else in the codebase does tax calculations.
 */

import { TAX_CONSTANTS as C } from './taxConstantsV1';

// ─────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────

function applyBrackets(taxableIncome: number, brackets: [number, number][]): number {
  let tax = 0, prev = 0;
  for (const [top, rate] of brackets) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, top) - prev) * rate;
    prev = top;
  }
  return Math.max(0, tax);
}

export function getV1MarginalRate(taxableIncome: number, filingStatus: string): number {
  const brackets = C.federalBrackets[filingStatus] || C.federalBrackets.single;
  for (const [top, rate] of brackets) {
    if (taxableIncome <= top) return rate;
  }
  return 0.37;
}

function calculateStateTax(income: number, filingStatus: string, stateKey: string): number {
  const state = C.states[stateKey];
  if (!state || state.type === 'none') return 0;

  if (state.type === 'flat') {
    return Math.round(income * (state.rate ?? 0));
  }

  if (state.type === 'progressive') {
    const stdDed = state.stdDed?.[filingStatus] || 0;
    const stateTaxable = Math.max(0, income - stdDed);
    const brackets = state.brackets?.[filingStatus] || state.brackets?.single;
    if (!brackets) return 0;
    return Math.round(applyBrackets(stateTaxable, brackets));
  }

  return 0;
}

function calculateFederalBrackets(taxableIncome: number, filingStatus: string): number {
  return Math.round(applyBrackets(taxableIncome, C.federalBrackets[filingStatus] || C.federalBrackets.single));
}

// ─────────────────────────────────────
// PROFILE INTERFACE
// ─────────────────────────────────────

export interface WorkStateAlloc {
  stateKey: string;
  incomePct: number; // 0-100, percent of relief income earned in this non-resident state
}

export interface TaxProfileV1 {
  entityType: '1099' | 'scorp' | string;
  annualReliefIncome: number;
  scorpSalary: number;
  extraWithholding: number;
  payPeriodsPerYear: number;
  filingStatus: string; // 'single' | 'mfj' | 'hoh'
  spouseW2Income: number;
  retirementContributions: number;
  annualBusinessExpenses: number;
  stateKey: string;
  workStates?: WorkStateAlloc[]; // non-resident states only
}

/**
 * Multi-state state-tax helper.
 * Calculates resident state tax + non-resident state tax with the standard
 * "credit for taxes paid to other states" applied at the resident level.
 *
 * Returns total state tax plus a per-state breakdown for display.
 */
export interface StateTaxBreakdownEntry {
  stateKey: string;
  incomeAllocated: number;
  taxOwed: number;
  isResident: boolean;
}

export function calculateMultiStateTax(
  totalStateIncome: number,
  filingStatus: string,
  residentStateKey: string,
  workStates: WorkStateAlloc[] = [],
): { totalStateTax: number; breakdown: StateTaxBreakdownEntry[]; residentCreditApplied: number } {
  const breakdown: StateTaxBreakdownEntry[] = [];

  // Sanitize allocations: clamp percentages, drop the resident state if mistakenly listed,
  // cap total non-resident allocation at 100%.
  const cleaned = (workStates || [])
    .filter(w => w && w.stateKey && w.stateKey !== residentStateKey)
    .map(w => ({ stateKey: w.stateKey, incomePct: Math.max(0, Math.min(100, Number(w.incomePct) || 0)) }));

  const sumPct = cleaned.reduce((s, w) => s + w.incomePct, 0);
  const scale = sumPct > 100 ? 100 / sumPct : 1;

  // Non-resident state tax
  let nonResidentTotal = 0;
  let totalNonResidentIncome = 0;
  for (const w of cleaned) {
    const allocPct = w.incomePct * scale;
    const allocIncome = Math.round(totalStateIncome * (allocPct / 100));
    if (allocIncome <= 0) continue;
    const tax = calculateStateTax(allocIncome, filingStatus, w.stateKey);
    totalNonResidentIncome += allocIncome;
    nonResidentTotal += tax;
    breakdown.push({ stateKey: w.stateKey, incomeAllocated: allocIncome, taxOwed: tax, isResident: false });
  }

  // Resident state taxes ALL income, then receives credit for taxes paid to non-residents,
  // capped at what the resident state would have charged on that same non-resident income.
  const residentTaxOnAll = calculateStateTax(totalStateIncome, filingStatus, residentStateKey);
  const residentTaxOnNonResIncome = totalNonResidentIncome > 0
    ? calculateStateTax(totalNonResidentIncome, filingStatus, residentStateKey)
    : 0;
  const credit = Math.min(nonResidentTotal, residentTaxOnNonResIncome);
  const residentTaxAfterCredit = Math.max(0, residentTaxOnAll - credit);

  breakdown.unshift({
    stateKey: residentStateKey,
    incomeAllocated: totalStateIncome,
    taxOwed: residentTaxAfterCredit,
    isResident: true,
  });

  return {
    totalStateTax: residentTaxAfterCredit + nonResidentTotal,
    breakdown,
    residentCreditApplied: credit,
  };
}

// ─────────────────────────────────────
// RESULT INTERFACES
// ─────────────────────────────────────

export interface Tax1099Result {
  path: '1099';
  grossIncome: number;
  expenses: number;
  netIncome: number;
  seBase: number;
  ssTax: number;
  medicareTax: number;
  additionalMedicare: number;
  totalSeTax: number;
  seDeduction: number;
  agi: number;
  federalTaxableIncome: number;
  totalFederalTax: number;
  vetFederalShare: number;
  spouseFederalTax: number;
  spouseWithholdingEstimate: number;
  stateTax: number;
  stateBreakdown: StateTaxBreakdownEntry[];
  annualObligation: number;
  annualEstimatedTaxDue: number;
  quarterlyPayment: number;
  marginalRate: number;
  effectiveRate: number;
  setAsideRate: number;
}

export interface TaxSCorpResult {
  path: 'scorp';
  grossRevenue: number;
  operatingExpenses: number;
  salary: number;
  employerFica: number;
  distribution: number;
  agi: number;
  federalTaxableIncome: number;
  totalFederalTax: number;
  marginalRate: number;
  stateTax: number;
  stateBreakdown: StateTaxBreakdownEntry[];
  salaryFederalWithheld: number;
  salaryStateWithheld: number;
  extraWithholdingAnnual: number;
  spouseFederalWithheld: number;
  spouseStateWithheld: number;
  totalAlreadyWithheld: number;
  federalOnDistribution: number;
  stateOnDistribution: number;
  annualEstimatedTaxDue: number;
  quarterlyPayment: number;
  effectiveRate: number;
  setAsideRate: number;
}

export type TaxV1Result = Tax1099Result | TaxSCorpResult;

// ─────────────────────────────────────
// PATH A — 1099 / LLC SOLE PROPRIETOR
// ─────────────────────────────────────

export function calculate1099Tax(profile: TaxProfileV1): Tax1099Result {
  const {
    annualReliefIncome,
    annualBusinessExpenses,
    filingStatus,
    spouseW2Income,
    retirementContributions,
    stateKey,
  } = profile;

  const fs = filingStatus || 'single';

  // Step 1 — Net business income
  const grossIncome = annualReliefIncome || 0;
  const expenses = annualBusinessExpenses || 0;
  const netIncome = Math.max(0, grossIncome - expenses);

  // Step 2 — SE tax
  const seBase = netIncome * C.seNetRate;
  const ssTax = Math.min(seBase, C.ssWageBase) * C.ssRate;
  const medicareTax = seBase * C.medicareRate;
  const addlMedicareThreshold = C.additionalMedicareThreshold[fs] ?? 200000;

  const thresholdUsedBySpouse = Math.min(spouseW2Income || 0, addlMedicareThreshold);
  const remainingThreshold = Math.max(0, addlMedicareThreshold - thresholdUsedBySpouse);
  const additionalMedicare = Math.max(0, seBase - remainingThreshold) * C.additionalMedicareRate;

  const totalSeTax = Math.round(ssTax + medicareTax + additionalMedicare);
  const seDeduction = Math.round(totalSeTax * 0.5);

  // Step 3 — Federal AGI and taxable income
  const agi = Math.max(0,
    netIncome
    - seDeduction
    - (retirementContributions || 0)
    + (spouseW2Income || 0)
  );
  // Federal already-paid component (spouse withholding)
  const stdDed = C.standardDeduction[fs] || C.standardDeduction.single;
  const federalTaxableIncome = Math.max(0, agi - stdDed);

  // Step 4 — Federal income tax on full household
  const totalFederalTax = calculateFederalBrackets(federalTaxableIncome, fs);

  // Step 5 — Subtract spouse withholding share
  const spouseAgi = Math.max(0, (spouseW2Income || 0) - stdDed);
  const spouseFederalTax = calculateFederalBrackets(Math.max(0, spouseAgi), fs);
  const vetFederalShare = Math.max(0, totalFederalTax - spouseFederalTax);

  // Step 6 — State tax on net business income (multi-state aware)
  const stateResult = calculateMultiStateTax(netIncome, fs, stateKey, profile.workStates);
  const stateTax = stateResult.totalStateTax;

  // Step 7 — Marginal rate
  const marginalRate = getV1MarginalRate(federalTaxableIncome, fs);

  // Step 8 — Total and quarterly
  const annualObligation = totalFederalTax + stateTax + totalSeTax;
  const spouseWithholdingEstimate = spouseFederalTax;
  const annualEstimatedTaxDue = Math.max(0, annualObligation - spouseWithholdingEstimate);
  const quarterlyPayment = Math.round(annualEstimatedTaxDue / 4);

  // Set-aside rate for per-shift nudge
  const stateEffective = netIncome > 0 ? stateTax / netIncome : 0;
  const seComponent = C.ssWageBase > seBase
    ? C.seNetRate * (C.ssRate + C.medicareRate)
    : C.seNetRate * C.medicareRate;
  const rawSetAside = marginalRate + stateEffective + seComponent;

  return {
    path: '1099',
    grossIncome,
    expenses,
    netIncome,
    seBase: Math.round(seBase),
    ssTax: Math.round(ssTax),
    medicareTax: Math.round(medicareTax),
    additionalMedicare: Math.round(additionalMedicare),
    totalSeTax,
    seDeduction,
    agi: Math.round(agi),
    federalTaxableIncome: Math.round(federalTaxableIncome),
    totalFederalTax,
    vetFederalShare,
    spouseFederalTax,
    spouseWithholdingEstimate,
    stateTax,
    stateBreakdown: stateResult.breakdown,
    annualObligation: Math.round(annualObligation),
    annualEstimatedTaxDue,
    quarterlyPayment,
    marginalRate,
    effectiveRate: grossIncome > 0
      ? Math.round((annualEstimatedTaxDue / grossIncome) * 1000) / 10
      : 0,
    setAsideRate: Math.min(0.50, Math.max(0.10, rawSetAside)),
  };
}

// ─────────────────────────────────────
// PATH B — S-CORP
// ─────────────────────────────────────

export function calculateSCorpTax(profile: TaxProfileV1): TaxSCorpResult {
  const {
    annualReliefIncome,
    annualBusinessExpenses,
    scorpSalary,
    extraWithholding,
    payPeriodsPerYear,
    filingStatus,
    spouseW2Income,
    retirementContributions,
    stateKey,
  } = profile;

  const fs = filingStatus || 'single';

  // Step 1 — S-Corp P&L
  const grossRevenue = annualReliefIncome || 0;
  const operatingExpenses = annualBusinessExpenses || 0;
  const salary = scorpSalary || 0;
  const employerFica = Math.round(salary * C.employerFicaRate);

  const distribution = Math.max(0,
    grossRevenue - operatingExpenses - salary - employerFica
  );

  // Step 3 — Federal AGI on full household
  const agi = Math.max(0,
    salary
    + distribution
    - (retirementContributions || 0)
    + (spouseW2Income || 0)
  );
  const stdDed = C.standardDeduction[fs] || C.standardDeduction.single;
  const federalTaxableIncome = Math.max(0, agi - stdDed);

  // Step 4 — Total household federal tax
  const totalFederalTax = calculateFederalBrackets(federalTaxableIncome, fs);
  const marginalRate = getV1MarginalRate(federalTaxableIncome, fs);

  // Step 5 — State tax on salary + distribution
  const personalStateIncome = salary + distribution;
  const stateTax = calculateStateTax(personalStateIncome, fs, stateKey);

  // Step 6 — What's already covered by withholding
  const salaryFederalWithheld = Math.round(salary * marginalRate);
  const salaryStateWithheld = calculateStateTax(salary, fs, stateKey);
  const extraWithholdingAnnual = Math.round((extraWithholding || 0) * (payPeriodsPerYear || 24));

  const spouseAgi = Math.max(0, (spouseW2Income || 0) - stdDed);
  const spouseFederalWithheld = calculateFederalBrackets(Math.max(0, spouseAgi), fs);
  const spouseStateWithheld = calculateStateTax(spouseW2Income || 0, fs, stateKey);

  const totalAlreadyWithheld = Math.min(
    salaryFederalWithheld
    + salaryStateWithheld
    + extraWithholdingAnnual
    + spouseFederalWithheld
    + spouseStateWithheld,
    totalFederalTax + stateTax,
  );

  // Step 7 — What the quarterly 1040-ES needs to cover
  const totalPersonalTax = totalFederalTax + stateTax;
  const annualEstimatedTaxDue = Math.max(0, totalPersonalTax - totalAlreadyWithheld);
  const quarterlyPayment = Math.round(annualEstimatedTaxDue / 4);

  // Step 8 — Federal tax attributable to distribution only (for display)
  const federalOnDistribution = Math.round(distribution * marginalRate);
  const stateOnDistribution = calculateStateTax(distribution, fs, stateKey);

  // Set-aside rate for per-shift nudge (on distribution income only)
  const stateEffective = personalStateIncome > 0 ? stateTax / personalStateIncome : 0;
  const rawSetAside = marginalRate + stateEffective;

  return {
    path: 'scorp',
    grossRevenue,
    operatingExpenses,
    salary,
    employerFica,
    distribution,
    agi: Math.round(agi),
    federalTaxableIncome: Math.round(federalTaxableIncome),
    totalFederalTax,
    marginalRate,
    stateTax,
    salaryFederalWithheld,
    salaryStateWithheld,
    extraWithholdingAnnual,
    spouseFederalWithheld,
    spouseStateWithheld,
    totalAlreadyWithheld,
    federalOnDistribution,
    stateOnDistribution,
    annualEstimatedTaxDue,
    quarterlyPayment,
    effectiveRate: grossRevenue > 0
      ? Math.round((annualEstimatedTaxDue / grossRevenue) * 1000) / 10
      : 0,
    setAsideRate: Math.min(0.45, Math.max(0.10, rawSetAside)),
  };
}

// ─────────────────────────────────────
// MASTER ENTRY POINT
// ─────────────────────────────────────

export function calculateTaxV1(profile: TaxProfileV1): TaxV1Result | null {
  if (!profile?.entityType) return null;
  return profile.entityType === '1099' || profile.entityType === 'sole_prop'
    ? calculate1099Tax(profile)
    : calculateSCorpTax(profile);
}

/**
 * Convenience: map a TaxIntelligenceProfile (DB shape) to TaxProfileV1 (calculator shape).
 */
export function mapDbProfileToV1(p: {
  entity_type: string;
  annual_relief_income: number;
  scorp_salary: number;
  extra_withholding: number;
  pay_periods_per_year: number;
  filing_status: string;
  spouse_w2_income: number;
  retirement_contribution: number;
  annual_business_expenses: number;
  state_code: string;
}): TaxProfileV1 {
  return {
    entityType: p.entity_type === 'sole_prop' ? '1099' : p.entity_type,
    annualReliefIncome: p.annual_relief_income || 0,
    scorpSalary: p.scorp_salary || 0,
    extraWithholding: p.extra_withholding || 0,
    payPeriodsPerYear: p.pay_periods_per_year || 24,
    filingStatus: p.filing_status === 'married_joint' ? 'mfj'
      : p.filing_status === 'head_of_household' ? 'hoh'
      : p.filing_status || 'single',
    spouseW2Income: p.spouse_w2_income || 0,
    retirementContributions: p.retirement_contribution || 0,
    annualBusinessExpenses: p.annual_business_expenses || 0,
    stateKey: p.state_code || '',
  };
}
