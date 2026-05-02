/**
 * Tax Calculator V1 — The single source of all tax math.
 * Two paths: 1099/LLC sole proprietor and S-Corp.
 * Nothing else in the codebase does tax calculations.
 */

import { TAX_CONSTANTS as C } from './taxConstants2026';

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

/**
 * Compute QBI deduction (Section 199A) for an SSTB taxpayer.
 *
 * Veterinary services are SSTB. SSTBs lose the deduction linearly across the
 * phase-in range above the threshold, reaching zero at the upper threshold.
 *
 * @param qbiAmount — net business income eligible for QBI (Sched C net for sole prop;
 *                    K-1 distribution for S-Corp; does NOT include W-2 wages)
 * @param taxableIncomeBeforeQbi — taxable income before applying QBI deduction
 *                                 (i.e., AGI − standard deduction, NOT yet QBI-reduced)
 * @param filingStatus — 'single' | 'married_joint' | 'head_of_household'
 * @returns deduction amount (always >= 0)
 */
// ─── Safe harbor & remaining-quarter helpers ───

type SafeHarborResult = {
  available: boolean;
  multiplier: 1.0 | 1.1;
  safeHarborAnnual: number;
  reason: string;
};

/**
 * Compute the prior-year safe harbor amount.
 * IRS: pay 100% of last year's tax (110% if prior AGI > $150K) → no penalty.
 */
function calculateSafeHarbor(
  priorYearTaxPaid: number,
  priorYearAgi: number
): SafeHarborResult {
  if (!priorYearTaxPaid || priorYearTaxPaid <= 0) {
    return {
      available: false,
      multiplier: 1.0,
      safeHarborAnnual: 0,
      reason: 'first_year_or_no_prior_data',
    };
  }
  const HIGH_INCOME_AGI_THRESHOLD = 150000;
  const multiplier: 1.0 | 1.1 = priorYearAgi > HIGH_INCOME_AGI_THRESHOLD ? 1.1 : 1.0;
  return {
    available: true,
    multiplier,
    safeHarborAnnual: Math.round(priorYearTaxPaid * multiplier),
    reason: multiplier === 1.1 ? 'prior_year_high_income_110pct' : 'prior_year_standard_100pct',
  };
}

type QuarterDueDate = {
  quarter: 1 | 2 | 3 | 4;
  dueDate: Date;
  paid: number;
};

function todayAtMidnight(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return m;
}

/**
 * Quarters whose due date is >= today (zeroed to midnight).
 * Q1 Apr 15, Q2 Jun 15, Q3 Sep 15, Q4 Jan 15 of next year.
 */
function computeRemainingQuarters(
  today: Date,
  quarterPayments: { q1: number; q2: number; q3: number; q4: number }
): QuarterDueDate[] {
  const year = today.getFullYear();
  const allQuarters: QuarterDueDate[] = [
    { quarter: 1, dueDate: new Date(year, 3, 15), paid: quarterPayments.q1 },
    { quarter: 2, dueDate: new Date(year, 5, 15), paid: quarterPayments.q2 },
    { quarter: 3, dueDate: new Date(year, 8, 15), paid: quarterPayments.q3 },
    { quarter: 4, dueDate: new Date(year + 1, 0, 15), paid: quarterPayments.q4 },
  ];
  const cutoff = todayAtMidnight(today);
  return allQuarters.filter(q => q.dueDate >= cutoff);
}

/**
 * Shared helper: given a profile and the current-year annual estimate,
 * compute safe harbor, recommendation, YTD payments, remaining quarters,
 * and the per-quarter recommended payment.
 */
function computeSafeHarborBlock(
  profile: { priorYearTaxPaid?: number; priorYearAgi?: number;
    q1EstimatedPayment?: number; q2EstimatedPayment?: number;
    q3EstimatedPayment?: number; q4EstimatedPayment?: number;
    today?: Date; },
  currentYearEstimate: number,
) {
  const today = profile.today || new Date();

  const safeHarbor = calculateSafeHarbor(
    profile.priorYearTaxPaid || 0,
    profile.priorYearAgi || 0,
  );

  let recommendedAnnual: number;
  let recommendationReason: string;
  if (!safeHarbor.available) {
    recommendedAnnual = currentYearEstimate;
    recommendationReason = 'first_year_only_current_year_available';
  } else if (currentYearEstimate >= safeHarbor.safeHarborAnnual) {
    recommendedAnnual = currentYearEstimate;
    recommendationReason = 'income_up_yoy_current_year_higher';
  } else {
    recommendedAnnual = safeHarbor.safeHarborAnnual;
    recommendationReason = 'income_down_yoy_safe_harbor_higher';
  }

  const ytdPaymentsTotal =
    (profile.q1EstimatedPayment || 0) +
    (profile.q2EstimatedPayment || 0) +
    (profile.q3EstimatedPayment || 0) +
    (profile.q4EstimatedPayment || 0);

  const recommendedRemaining = Math.max(0, recommendedAnnual - ytdPaymentsTotal);

  const remainingQuarters = computeRemainingQuarters(today, {
    q1: profile.q1EstimatedPayment || 0,
    q2: profile.q2EstimatedPayment || 0,
    q3: profile.q3EstimatedPayment || 0,
    q4: profile.q4EstimatedPayment || 0,
  });

  const quartersRemaining = remainingQuarters.length;
  const recommendedQuarterlyPayment = quartersRemaining > 0
    ? Math.round(recommendedRemaining / quartersRemaining)
    : 0;

  const nextDueDate = remainingQuarters.length > 0
    ? remainingQuarters[0].dueDate.toISOString().slice(0, 10)
    : null;

  return {
    currentYearEstimate,
    safeHarborAvailable: safeHarbor.available,
    safeHarborMultiplier: safeHarbor.multiplier,
    safeHarborAnnual: safeHarbor.safeHarborAnnual,
    recommendedAnnual,
    recommendationReason,
    ytdPaymentsTotal,
    recommendedRemaining,
    quartersRemaining,
    nextDueDate,
    recommendedQuarterlyPayment,
  };
}
  qbiAmount: number,
  taxableIncomeBeforeQbi: number,
  filingStatus: string
): number {
  if (qbiAmount <= 0 || taxableIncomeBeforeQbi <= 0) return 0;

  const thresholds = C.qbiThresholds[filingStatus] || C.qbiThresholds.single;
  const baseDeduction = qbiAmount * C.qbiRate;
  const taxableIncomeCap = taxableIncomeBeforeQbi * C.qbiRate;

  // Below threshold: full deduction (capped at 20% of taxable income)
  if (taxableIncomeBeforeQbi <= thresholds.lower) {
    return Math.round(Math.min(baseDeduction, taxableIncomeCap));
  }

  // Above upper threshold: SSTB gets zero
  if (taxableIncomeBeforeQbi >= thresholds.upper) {
    return 0;
  }

  // In phase-out range: linear reduction (SSTB)
  const excessIncome = taxableIncomeBeforeQbi - thresholds.lower;
  const phaseOutFraction = excessIncome / thresholds.phaseInRange;
  const reducedDeduction = baseDeduction * (1 - phaseOutFraction);
  return Math.round(Math.max(0, Math.min(reducedDeduction, taxableIncomeCap)));
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
  filingStatus: string; // 'single' | 'married_joint' | 'head_of_household'
  spouseW2Income: number;
  userW2Income?: number; // user's own W-2 wages (separate from spouse)
  retirementContributions: number;
  annualBusinessExpenses: number;
  stateKey: string;
  workStates?: WorkStateAlloc[]; // non-resident states only
  pteElected?: boolean; // CA Pass-Through Entity Tax election (S-Corp only)
  priorYearTaxPaid?: number;
  priorYearAgi?: number;
  q1EstimatedPayment?: number;
  q2EstimatedPayment?: number;
  q3EstimatedPayment?: number;
  q4EstimatedPayment?: number;
  today?: Date;
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
  qbiDeduction: number;
  qbiAmount: number;
  ptetPaid: number;
  ptetEligible: boolean;
  currentYearEstimate: number;
  safeHarborAvailable: boolean;
  safeHarborMultiplier: 1.0 | 1.1;
  safeHarborAnnual: number;
  recommendedAnnual: number;
  recommendationReason: string;
  ytdPaymentsTotal: number;
  recommendedRemaining: number;
  quartersRemaining: number;
  nextDueDate: string | null;
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
  qbiDeduction: number;
  qbiAmount: number;
  ptetPaid: number;
  ptetEligible: boolean;
  currentYearEstimate: number;
  safeHarborAvailable: boolean;
  safeHarborMultiplier: 1.0 | 1.1;
  safeHarborAnnual: number;
  recommendedAnnual: number;
  recommendationReason: string;
  ytdPaymentsTotal: number;
  recommendedRemaining: number;
  quartersRemaining: number;
  nextDueDate: string | null;
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
  const userW2 = profile.userW2Income || 0;

  // Step 1 — Net business income
  const grossIncome = annualReliefIncome || 0;
  const expenses = annualBusinessExpenses || 0;
  const netIncome = Math.max(0, grossIncome - expenses);

  // Step 2 — SE tax
  // SS wage base is per-earner; user's own W-2 wages count first toward the cap.
  const seBase = netIncome * C.seNetRate;
  const ssRemainingForSE = Math.max(0, C.ssWageBase - userW2);
  const ssTax = Math.min(seBase, ssRemainingForSE) * C.ssRate;
  const medicareTax = seBase * C.medicareRate;
  const addlMedicareThreshold = C.additionalMedicareThreshold[fs] ?? 200000;

  // Both spouse W-2 and user's own W-2 wages consume the Additional Medicare threshold.
  const thresholdUsedByW2 = Math.min((spouseW2Income || 0) + userW2, addlMedicareThreshold);
  const remainingThreshold = Math.max(0, addlMedicareThreshold - thresholdUsedByW2);
  const additionalMedicare = Math.max(0, seBase - remainingThreshold) * C.additionalMedicareRate;

  const totalSeTax = Math.round(ssTax + medicareTax + additionalMedicare);
  const seDeduction = Math.round(totalSeTax * 0.5);

  // Step 3 — Federal AGI and taxable income
  // User's own W-2 wages are part of their AGI (the vet's share, not subtracted later).
  const agi = Math.max(0,
    netIncome
    - seDeduction
    - (retirementContributions || 0)
    + (spouseW2Income || 0)
    + userW2
  );
  const stdDed = C.standardDeduction[fs] || C.standardDeduction.single;
  const taxableIncomeBeforeQbi = Math.max(0, agi - stdDed);

  // QBI deduction (Section 199A) — vets are SSTB. QBI base for sole prop = Sched C net.
  const qbiAmount = netIncome;
  const qbiDeduction = calculateQBIDeduction(qbiAmount, taxableIncomeBeforeQbi, fs);
  const federalTaxableIncome = Math.max(0, taxableIncomeBeforeQbi - qbiDeduction);

  // Step 4 — Federal income tax on full household
  const totalFederalTax = calculateFederalBrackets(federalTaxableIncome, fs);

  // Step 5 — Subtract spouse withholding share (user's own W-2 stays in vet's share)
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

  // Set-aside rate for per-shift nudge
  const stateEffective = netIncome > 0 ? stateTax / netIncome : 0;
  const seComponent = ssRemainingForSE > seBase
    ? C.seNetRate * (C.ssRate + C.medicareRate)
    : C.seNetRate * C.medicareRate;
  const rawSetAside = marginalRate + stateEffective + seComponent;

  const sh = computeSafeHarborBlock(profile, annualEstimatedTaxDue);

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
    quarterlyPayment: sh.recommendedQuarterlyPayment,
    marginalRate,
    effectiveRate: grossIncome > 0
      ? Math.round((annualEstimatedTaxDue / grossIncome) * 1000) / 10
      : 0,
    setAsideRate: Math.min(0.50, Math.max(0.10, rawSetAside)),
    qbiDeduction,
    qbiAmount,
    ptetPaid: 0,       // PTET applies only to S-Corp path
    ptetEligible: false,
    currentYearEstimate: sh.currentYearEstimate,
    safeHarborAvailable: sh.safeHarborAvailable,
    safeHarborMultiplier: sh.safeHarborMultiplier,
    safeHarborAnnual: sh.safeHarborAnnual,
    recommendedAnnual: sh.recommendedAnnual,
    recommendationReason: sh.recommendationReason,
    ytdPaymentsTotal: sh.ytdPaymentsTotal,
    recommendedRemaining: sh.recommendedRemaining,
    quartersRemaining: sh.quartersRemaining,
    nextDueDate: sh.nextDueDate,
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
  const userW2 = profile.userW2Income || 0;

  // Step 1 — S-Corp P&L
  const grossRevenue = annualReliefIncome || 0;
  const operatingExpenses = annualBusinessExpenses || 0;
  const salary = scorpSalary || 0;
  const employerFica = Math.round(salary * C.employerFicaRate);

  const distribution = Math.max(0,
    grossRevenue - operatingExpenses - salary - employerFica
  );

  // Step 2 — Initial AGI on full household
  // (PTET deduction, if applicable, is applied below.)
  let agi = Math.max(0,
    salary
    + distribution
    - (retirementContributions || 0)
    + (spouseW2Income || 0)
    + userW2
  );
  const stdDed = C.standardDeduction[fs] || C.standardDeduction.single;

  // Step 3 — PTET (CA Pass-Through Entity Tax) — S-Corp + CA + elected
  const ptetEligible = !!(profile.pteElected && stateKey === 'CA' && (profile.entityType === 'scorp'));
  let ptetPaid = 0;
  if (ptetEligible) {
    // PTET is 9.3% of qualified net business income (post-expenses, pre-salary split).
    const qualifiedPteIncome = Math.max(0, grossRevenue - operatingExpenses);
    ptetPaid = Math.round(qualifiedPteIncome * 0.093);
    // PTET is deductible federally (paid at entity level) — reduces AGI.
    agi = Math.max(0, agi - ptetPaid);
  }

  const taxableIncomeBeforeQbi = Math.max(0, agi - stdDed);

  // Step 3b — QBI deduction (Section 199A) — vets are SSTB.
  // QBI base for S-Corp = K-1 distribution (NOT including W-2 salary).
  const qbiAmount = distribution;
  const qbiDeduction = calculateQBIDeduction(qbiAmount, taxableIncomeBeforeQbi, fs);
  const federalTaxableIncome = Math.max(0, taxableIncomeBeforeQbi - qbiDeduction);

  // Step 4 — Total household federal tax
  const totalFederalTax = calculateFederalBrackets(federalTaxableIncome, fs);
  const marginalRate = getV1MarginalRate(federalTaxableIncome, fs);

  // Step 5 — State tax on salary + distribution (multi-state aware)
  // If PTET elected, CA personal tax on the entity's income is zeroed out (entity paid it).
  const personalStateIncome = salary + distribution;
  let stateResult = calculateMultiStateTax(personalStateIncome, fs, stateKey, profile.workStates);
  let stateTax = stateResult.totalStateTax;
  if (ptetEligible) {
    // Personal CA tax is replaced by the entity-level PTET payment.
    stateTax = 0;
    stateResult = { totalStateTax: 0, breakdown: [], residentCreditApplied: 0 };
  }

  // Step 6 — What's already covered by withholding
  const salaryFederalWithheld = Math.round(salary * marginalRate);
  const salaryStateWithheld = ptetEligible ? 0 : calculateStateTax(salary, fs, stateKey);
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
  const stateOnDistribution = ptetEligible ? 0 : calculateStateTax(distribution, fs, stateKey);

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
    stateBreakdown: stateResult.breakdown,
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
    qbiDeduction,
    qbiAmount,
    ptetPaid,
    ptetEligible,
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
  other_w2_income?: number;
  retirement_contribution: number;
  annual_business_expenses: number;
  state_code: string;
  pte_elected?: boolean;
  work_states?: { state_code: string; income_pct: number }[];
}): TaxProfileV1 {
  return {
    entityType: p.entity_type === 'sole_prop' ? '1099' : p.entity_type,
    annualReliefIncome: p.annual_relief_income || 0,
    scorpSalary: p.scorp_salary || 0,
    extraWithholding: p.extra_withholding || 0,
    payPeriodsPerYear: p.pay_periods_per_year || 24,
    filingStatus: p.filing_status || 'single',
    spouseW2Income: p.spouse_w2_income || 0,
    userW2Income: p.other_w2_income || 0,
    retirementContributions: p.retirement_contribution || 0,
    annualBusinessExpenses: p.annual_business_expenses || 0,
    stateKey: p.state_code || '',
    pteElected: !!p.pte_elected,
    workStates: Array.isArray(p.work_states)
      ? p.work_states
          .filter(w => w && typeof w.state_code === 'string')
          .map(w => ({ stateKey: w.state_code, incomePct: Number(w.income_pct) || 0 }))
      : [],
  };
}
