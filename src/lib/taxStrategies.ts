/**
 * Tax Strategy Guidance Engine — Pure calculation functions.
 * 7 strategies with eligibility checks and savings calculations.
 */

import { TAX_YEAR_CONFIG, RETIREMENT_LIMITS, getMarginalRate, SE_TAX_RATE, SE_TAXABLE_FACTOR, SS_WAGE_CAP } from './taxConstants2026';
import type { FilingStatus } from './taxConstants2026';
import type { Shift, Invoice } from '@/types';

// ── Types ────────────────────────────────────────────────────────

export interface StrategyInputs {
  deduction_checklist: Record<string, number>;
  home_office_sqft: number;
  weekly_business_miles: number;
  retirement_vehicle: string;
  retirement_contribution_slider: number;
  scorp_salary_slider: number;
  prior_year_tax: number;
  dismissed_strategies: string[];
}

export const DEFAULT_INPUTS: StrategyInputs = {
  deduction_checklist: {},
  home_office_sqft: 0,
  weekly_business_miles: 0,
  retirement_vehicle: 'sep_ira',
  retirement_contribution_slider: 0,
  scorp_salary_slider: 110000,
  prior_year_tax: 0,
  dismissed_strategies: [],
};

export interface DeductionItem {
  key: string;
  label: string;
  defaultAmount: number;
  description: string;
}

export const VET_DEDUCTIONS: DeductionItem[] = [
  { key: 'dea', label: 'DEA Registration', defaultAmount: 315, description: 'Annual DEA registration fee' },
  { key: 'usda', label: 'USDA Accreditation Fees', defaultAmount: 150, description: 'Federal accreditation renewal' },
  { key: 'state_license', label: 'State Veterinary License', defaultAmount: 250, description: 'State license renewal fee' },
  { key: 'ce', label: 'CE / Continuing Education', defaultAmount: 2000, description: 'Courses, conferences, and seminars' },
  { key: 'avma', label: 'AVMA / VMA Dues', defaultAmount: 500, description: 'Professional association memberships' },
  { key: 'liability', label: 'Liability Insurance', defaultAmount: 1200, description: 'Professional liability / malpractice coverage' },
  { key: 'scrubs', label: 'Scrubs & Equipment', defaultAmount: 500, description: 'Work clothing, stethoscopes, instruments' },
  { key: 'health_insurance', label: 'Health Insurance Premiums', defaultAmount: 6000, description: 'Self-employed health insurance deduction' },
];

export interface StrategyResult {
  id: string;
  title: string;
  description: string;
  estimatedSavings: number;
  eligible: boolean;
  unlockLabel: string | null;
  dismissed: boolean;
  status: 'action_available' | 'not_eligible' | 'dismissed';
  whyItMatters: string;
  howItWorks: string[];
  actionSteps: string[];
}

// ── Annualized Income ────────────────────────────────────────────

export function getAnnualizedIncome(shifts: Shift[], invoices: Invoice[]): number {
  const paidInvoices = invoices.filter(i => i.paid_at);
  const totalPaid = paidInvoices.reduce((s, i) => s + i.total_amount, 0);
  if (totalPaid <= 0) return 0;

  // Calculate weeks worked from shifts
  const shiftDates = shifts
    .filter(s => new Date(s.end_datetime) < new Date())
    .map(s => new Date(s.start_datetime).getTime());

  if (shiftDates.length < 2) {
    const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
    return (totalPaid / monthsElapsed) * 12;
  }

  const earliest = Math.min(...shiftDates);
  const latest = Math.max(...shiftDates);
  const weeksWorked = Math.max(1, (latest - earliest) / (7 * 24 * 60 * 60 * 1000));

  return (totalPaid / weeksWorked) * 52;
}

// ── Combined Marginal Rate ──────────────────────────────────────

export function getCombinedMarginalRate(
  annualizedIncome: number,
  filingStatus: FilingStatus = 'single',
  stateRate: number = 0.05,
  entityType: string = 'sole_prop',
): number {
  const federalRate = getMarginalRate(annualizedIncome, filingStatus);
  // S-Corp: no SE tax on distributions — FICA is paid on salary separately
  const selfEmploymentComponent = entityType === 'scorp' ? 0 : SE_TAX_RATE;
  return federalRate + selfEmploymentComponent + stateRate;
}

// ── Strategy Calculations ────────────────────────────────────────

function calcDeductionsSavings(inputs: StrategyInputs, combinedRate: number): number {
  const total = Object.values(inputs.deduction_checklist).reduce((s, v) => s + (v || 0), 0);
  return Math.round(total * combinedRate);
}

function calcHomeOfficeSavings(sqft: number, combinedRate: number): number {
  const deduction = Math.min(sqft * 5, 1500);
  return Math.round(deduction * combinedRate);
}

function calcMileageSavings(weeklyMiles: number, combinedRate: number): number {
  const annualMiles = weeklyMiles * 52;
  const deduction = annualMiles * TAX_YEAR_CONFIG.standardMileageRate;
  return Math.round(deduction * combinedRate);
}

function calcSepIraSavings(annualizedIncome: number, contributionOverride: number, combinedRate: number): number {
  const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
  const maxContribution = Math.min(netSE * RETIREMENT_LIMITS.sep_ira.percentOfNet, RETIREMENT_LIMITS.sep_ira.maxContribution);
  const contribution = contributionOverride > 0 ? Math.min(contributionOverride, maxContribution) : maxContribution;
  return Math.round(contribution * combinedRate);
}

function calcSolo401kDelta(annualizedIncome: number): number {
  const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
  const sepMax = Math.min(netSE * RETIREMENT_LIMITS.sep_ira.percentOfNet, RETIREMENT_LIMITS.sep_ira.maxContribution);
  const solo401kMax = Math.min(
    RETIREMENT_LIMITS.solo_401k.employeeMax + netSE * RETIREMENT_LIMITS.solo_401k.employerPercent,
    RETIREMENT_LIMITS.solo_401k.totalMax,
  );
  return Math.max(0, solo401kMax - sepMax);
}

function calcSCorpSavings(annualizedIncome: number, salary: number): number {
  const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
  // Current SE tax as sole prop
  const ssBase = Math.min(netSE, SS_WAGE_CAP);
  const currentSETax = ssBase * 0.124 + netSE * 0.029;

  // S-Corp: SE tax only on salary
  const cappedSalary = Math.min(salary, annualizedIncome);
  const sCorpSS = Math.min(cappedSalary, SS_WAGE_CAP) * 0.124;
  const sCorpMedicare = cappedSalary * 0.029;
  const sCorpPayroll = (sCorpSS + sCorpMedicare) * 2; // employer + employee

  const overhead = 2500;
  const savings = currentSETax - sCorpPayroll - overhead;
  return Math.max(0, Math.round(savings));
}

// ── Build All Strategies ─────────────────────────────────────────

export function buildStrategies(
  annualizedIncome: number,
  inputs: StrategyInputs,
  filingStatus: FilingStatus = 'single',
  stateRate: number = 0.05,
  facilityCount: number = 0,
  entityType: string = 'sole_prop',
): StrategyResult[] {
  const combinedRate = getCombinedMarginalRate(annualizedIncome, filingStatus, stateRate, entityType);
  const isScorp = entityType === 'scorp';
  const dismissed = new Set(inputs.dismissed_strategies);

  const strategies: StrategyResult[] = [];

  // 1. Vet Deductions — always eligible
  const deductionSavings = calcDeductionsSavings(inputs, combinedRate);
  const defaultDeductionTotal = VET_DEDUCTIONS.reduce((s, d) => s + d.defaultAmount, 0);
  const displayDeductionSavings = deductionSavings > 0 ? deductionSavings : Math.round(defaultDeductionTotal * combinedRate);
  strategies.push({
    id: 'vet_deductions',
    title: 'Vet-Specific Deductions Checklist',
    description: 'Track deductible professional expenses specific to veterinary relief work',
    estimatedSavings: displayDeductionSavings,
    eligible: true,
    unlockLabel: null,
    dismissed: dismissed.has('vet_deductions'),
    status: dismissed.has('vet_deductions') ? 'dismissed' : 'action_available',
    whyItMatters: `As a relief vet, you have professional expenses that are fully deductible — DEA fees, licenses, CE courses, insurance, and more. At your income level, each $1,000 in deductions saves you roughly $${Math.round(combinedRate * 1000)} in taxes.`,
    howItWorks: [
      'List all professional expenses you pay out of pocket',
      'Each expense reduces your taxable income dollar-for-dollar',
      'Your combined tax rate determines the actual cash savings',
      'Keep receipts and documentation for every deduction',
      'These deductions are reported on Schedule C of your tax return',
    ],
    actionSteps: [
      'Review the checklist below and enter your actual costs for each item',
      'Check your bank/credit card statements for any missed expenses',
      'Set up a system to save receipts throughout the year',
      'Share your totals with your CPA at tax time',
    ],
  });

  // 2. Home Office
  const homeEligible = annualizedIncome > 50000;
  const homeOfficeSavings = homeEligible ? calcHomeOfficeSavings(inputs.home_office_sqft || 150, combinedRate) : 0;
  strategies.push({
    id: 'home_office',
    title: 'Home Office Deduction',
    description: 'Deduct a portion of your home expenses for your relief vet business office',
    estimatedSavings: homeOfficeSavings || Math.round(1500 * combinedRate),
    eligible: homeEligible,
    unlockLabel: homeEligible ? null : 'Unlocks at $50K+',
    dismissed: dismissed.has('home_office'),
    status: dismissed.has('home_office') ? 'dismissed' : homeEligible ? 'action_available' : 'not_eligible',
    whyItMatters: `If you use part of your home exclusively for scheduling shifts, billing clinics, and managing your relief practice, you can deduct up to $1,500/year using the simplified method. At your tax rate, that's up to $${Math.round(1500 * combinedRate)} in savings.`,
    howItWorks: [
      'The simplified method allows $5 per square foot, up to 300 sq ft',
      'Maximum deduction is $1,500/year',
      'The space must be used regularly and exclusively for business',
      'No need to track actual home expenses with the simplified method',
      'Reported on Schedule C, Line 30',
    ],
    actionSteps: [
      'Measure your dedicated home office space',
      'Enter the square footage using the slider below',
      'Ensure the space is used exclusively for your relief vet business',
      'Take a photo of your office setup for documentation',
    ],
  });

  // 3. Mileage
  const mileageEligible = annualizedIncome > 50000 || facilityCount >= 2;
  const weeklyMiles = inputs.weekly_business_miles || (facilityCount > 0 ? facilityCount * 25 : 50);
  const mileageSavings = mileageEligible ? calcMileageSavings(weeklyMiles, combinedRate) : 0;
  strategies.push({
    id: 'mileage',
    title: 'Mileage Deduction',
    description: 'Deduct business miles driving between clinics and facilities',
    estimatedSavings: mileageSavings || Math.round(50 * 52 * TAX_YEAR_CONFIG.standardMileageRate * combinedRate),
    eligible: mileageEligible,
    unlockLabel: mileageEligible ? null : 'Unlocks at $50K+ or 2+ clinics',
    dismissed: dismissed.has('mileage'),
    status: dismissed.has('mileage') ? 'dismissed' : mileageEligible ? 'action_available' : 'not_eligible',
    whyItMatters: `Driving between clinics is one of the biggest deductions for relief vets. At $${TAX_YEAR_CONFIG.standardMileageRate}/mile, ${weeklyMiles * 52} annual miles = $${Math.round(weeklyMiles * 52 * TAX_YEAR_CONFIG.standardMileageRate).toLocaleString()} deduction.`,
    howItWorks: [
      `The 2026 IRS standard mileage rate is $${TAX_YEAR_CONFIG.standardMileageRate}/mile`,
      'Business miles include driving between clinics and to temporary work locations',
      'Your regular commute from home to your first clinic is not deductible',
      'Driving from one clinic to another during the day is fully deductible',
      'Keep a mileage log with date, destination, purpose, and miles driven',
    ],
    actionSteps: [
      'Enter your typical weekly business miles below',
      'Consider using a mileage tracking app for automatic logging',
      'Review your shift schedule to estimate inter-clinic driving',
      'Save your mileage log for tax filing',
    ],
  });

  // 4. SEP-IRA
  const sepEligible = annualizedIncome > 60000;
  const sepSavings = sepEligible ? calcSepIraSavings(annualizedIncome, inputs.retirement_contribution_slider, combinedRate) : 0;
  const netSE = annualizedIncome * SE_TAXABLE_FACTOR;
  const sepMax = Math.min(netSE * RETIREMENT_LIMITS.sep_ira.percentOfNet, RETIREMENT_LIMITS.sep_ira.maxContribution);
  const retirementIncomeBase = isScorp ? (inputs.scorp_salary_slider || 110000) : annualizedIncome;
  strategies.push({
    id: 'sep_ira',
    title: 'SEP-IRA Contribution',
    description: isScorp
      ? 'Shelter up to 25% of your W-2 salary in a tax-deferred retirement account'
      : 'Shelter up to 25% of net self-employment income in a tax-deferred retirement account',
    estimatedSavings: sepSavings || 0,
    eligible: sepEligible,
    unlockLabel: sepEligible ? null : 'Unlocks at $60K+',
    dismissed: dismissed.has('sep_ira'),
    status: dismissed.has('sep_ira') ? 'dismissed' : sepEligible ? 'action_available' : 'not_eligible',
    whyItMatters: isScorp
      ? `As an S-Corp, your SEP-IRA contributions are based on your W-2 salary of $${Math.round(retirementIncomeBase).toLocaleString()}. You could contribute up to $${Math.round(Math.min(retirementIncomeBase * 0.25, RETIREMENT_LIMITS.sep_ira.maxContribution)).toLocaleString()}.`
      : `At your estimated income of $${Math.round(annualizedIncome).toLocaleString()}, you could contribute up to $${Math.round(sepMax).toLocaleString()} to a SEP-IRA. This reduces your taxable income immediately and grows tax-deferred for retirement.`,
    howItWorks: [
      isScorp ? 'Contribute up to 25% of your W-2 salary' : 'Contribute up to 25% of net self-employment income (after SE tax deduction)',
      `2026 maximum contribution: $${RETIREMENT_LIMITS.sep_ira.maxContribution.toLocaleString()}`,
      'Contributions are tax-deductible — they reduce your taxable income dollar-for-dollar',
      'Investments grow tax-deferred until withdrawal in retirement',
      'Can be opened and funded up until your tax filing deadline (including extensions)',
    ],
    actionSteps: [
      'Open a SEP-IRA at a brokerage (Fidelity, Schwab, Vanguard)',
      'Use the slider below to set your planned contribution',
      'Make contributions before your tax filing deadline',
      'Report the deduction on Form 1040, Schedule 1',
    ],
  });

  // 5. Solo 401(k) vs SEP
  const solo401kEligible = annualizedIncome > 100000;
  const solo401kDelta = solo401kEligible ? calcSolo401kDelta(annualizedIncome) : 0;
  const solo401kSavings = Math.round(solo401kDelta * combinedRate);
  strategies.push({
    id: 'solo_401k',
    title: 'Solo 401(k) vs SEP-IRA Comparison',
    description: isScorp
      ? 'Compare retirement options — Solo 401(k) employee deferral is based on your W-2 salary'
      : 'Compare retirement plan options — Solo 401(k) may allow higher contributions',
    estimatedSavings: solo401kSavings,
    eligible: solo401kEligible,
    unlockLabel: solo401kEligible ? null : 'Unlocks at $100K+',
    dismissed: dismissed.has('solo_401k'),
    status: dismissed.has('solo_401k') ? 'dismissed' : solo401kEligible ? 'action_available' : 'not_eligible',
    whyItMatters: isScorp
      ? `As an S-Corp, your Solo 401(k) employee deferral ($${RETIREMENT_LIMITS.solo_401k.employeeMax.toLocaleString()}) comes from your W-2 salary. Employer contributions are based on 25% of salary.`
      : `At higher incomes, the Solo 401(k) allows an additional $${RETIREMENT_LIMITS.solo_401k.employeeMax.toLocaleString()} employee deferral on top of employer contributions. This can mean $${solo401kDelta.toLocaleString()} more in tax-sheltered savings compared to a SEP-IRA.`,
    howItWorks: [
      `SEP-IRA max: 25% of ${isScorp ? 'W-2 salary' : 'net SE income'}, capped at $${RETIREMENT_LIMITS.sep_ira.maxContribution.toLocaleString()}`,
      `Solo 401(k): $${RETIREMENT_LIMITS.solo_401k.employeeMax.toLocaleString()} employee + 25% employer, capped at $${RETIREMENT_LIMITS.solo_401k.totalMax.toLocaleString()}`,
      isScorp ? 'As an S-Corp, both employee and employer contributions are based on your W-2 salary' : 'At moderate incomes, both plans have similar limits',
      'At higher incomes, the Solo 401(k) employee deferral creates a meaningful gap',
      'Solo 401(k) also allows Roth contributions (post-tax, tax-free growth)',
    ],
    actionSteps: [
      'Review the comparison table below with your actual numbers',
      'If the Solo 401(k) offers more room, consider opening one before year-end',
      'Note: Solo 401(k) must be established by December 31 (contributions can be made later)',
      'Consult your CPA about which plan fits your situation',
    ],
  });

  // 6. S-Corp — show different card based on entity type
  const sCorpEligible = annualizedIncome > 80000;
  const sCorpSavings = sCorpEligible ? calcSCorpSavings(annualizedIncome, inputs.scorp_salary_slider) : 0;

  if (isScorp) {
    // Already S-Corp: show salary optimization tool
    const salary = inputs.scorp_salary_slider || 110000;
    const distribution = Math.max(0, annualizedIncome - salary);
    strategies.push({
      id: 'scorp',
      title: 'Reasonable Salary Optimization',
      description: 'Optimize your salary vs. distribution split to minimize payroll taxes',
      estimatedSavings: 0, // Savings shown in the interactive calculator
      eligible: true,
      unlockLabel: null,
      dismissed: dismissed.has('scorp'),
      status: dismissed.has('scorp') ? 'dismissed' : 'action_available',
      whyItMatters: `As an S-Corp, your salary of $${Math.round(salary).toLocaleString()} is subject to payroll taxes (employer + employee FICA), while your distributions of $${Math.round(distribution).toLocaleString()} are not. Finding the right balance between a "reasonable" salary and distributions is key to maximizing your S-Corp tax advantage.`,
      howItWorks: [
        'Your salary must be "reasonable" — what an employed DVM in a similar role would earn',
        'Payroll taxes (FICA) apply to salary at ~15.3% combined (employer + employee)',
        'Distributions above salary are exempt from payroll taxes',
        'Setting salary too low risks IRS audit; too high negates S-Corp benefits',
        'Payroll taxes are separate from quarterly estimated income tax payments',
      ],
      actionSteps: [
        'Use the salary slider below to model different salary levels',
        'Research comparable employed DVM salaries in your area',
        'Review with your CPA to ensure your salary is defensible',
        'Adjust your payroll service (Gusto, ADP) accordingly',
      ],
    });
  } else {
    // 1099 / Sole Prop: show S-Corp election analysis
    strategies.push({
      id: 'scorp',
      title: 'S-Corp Election Analysis',
      description: 'Estimate potential self-employment tax savings from electing S-Corp status',
      estimatedSavings: sCorpSavings,
      eligible: sCorpEligible,
      unlockLabel: sCorpEligible ? null : 'Unlocks at $80K+',
      dismissed: dismissed.has('scorp'),
      status: dismissed.has('scorp') ? 'dismissed' : sCorpEligible ? 'action_available' : 'not_eligible',
      whyItMatters: `At your current income of $${Math.round(annualizedIncome).toLocaleString()}, switching to an S-Corp structure could save you approximately $${sCorpSavings.toLocaleString()} in self-employment tax. Distributions above your reasonable salary are exempt from SE tax.`,
      howItWorks: [
        'As a sole proprietor, you pay 15.3% SE tax on all net earnings',
        'As an S-Corp, you pay yourself a "reasonable salary" subject to payroll tax',
        'Remaining profits are distributed and NOT subject to SE tax',
        'S-Corp has additional overhead: payroll service, separate tax return (~$2,500/yr)',
        'The "reasonable salary" should reflect what an employed DVM in a similar role would earn',
      ],
      actionSteps: [
        'Use the salary slider below to model different scenarios',
        'File Form 2553 with the IRS to elect S-Corp status',
        'Set up payroll through a service like Gusto or ADP',
        'Discuss timing with your CPA — election must be filed by March 15',
      ],
    });
  }

  // 7. Quarterly Deadlines — always eligible
  const nextDeadline = getNextQuarterlyDeadline();
  strategies.push({
    id: 'quarterly_deadlines',
    title: 'Quarterly Estimated Tax Deadlines',
    description: 'Stay on track with IRS 1040-ES deadlines and avoid underpayment penalties',
    estimatedSavings: 0,
    eligible: true,
    unlockLabel: null,
    dismissed: dismissed.has('quarterly_deadlines'),
    status: dismissed.has('quarterly_deadlines') ? 'dismissed' : 'action_available',
    whyItMatters: `Missing quarterly estimated tax payments can result in IRS underpayment penalties. Your next payment of approximately $${Math.round(annualizedIncome > 0 ? (annualizedIncome * 0.3) / 4 : 0).toLocaleString()} is due ${nextDeadline.label}.`,
    howItWorks: [
      'Self-employed individuals must pay estimated taxes quarterly',
      'Deadlines: April 15, June 16, September 15, January 15',
      'Underpayment penalties apply if you owe >$1,000 at filing',
      'Safe harbor: pay 100% of prior year tax (110% if income >$150K) to avoid penalties',
      'Payments made via IRS Direct Pay or EFTPS',
    ],
    actionSteps: [
      'Calculate your recommended quarterly payment below',
      'Set a calendar reminder 2 weeks before each deadline',
      'Pay via IRS Direct Pay (irs.gov/payments) or EFTPS',
      'Keep confirmation numbers for your records',
    ],
  });

  return strategies;
}

// ── Quarterly Deadline Helpers ────────────────────────────────────

export interface QuarterlyDeadline {
  quarter: number;
  dueDate: string;
  label: string;
  daysUntil: number;
  isPast: boolean;
}

export function getQuarterlyDeadlines(): QuarterlyDeadline[] {
  const now = new Date();
  const year = now.getFullYear();
  const deadlines = [
    { quarter: 1, dueDate: `${year}-04-15`, label: 'Q1 — Apr 15' },
    { quarter: 2, dueDate: `${year}-06-16`, label: 'Q2 — Jun 16' },
    { quarter: 3, dueDate: `${year}-09-15`, label: 'Q3 — Sep 15' },
    { quarter: 4, dueDate: `${year + 1}-01-15`, label: 'Q4 — Jan 15' },
  ];

  return deadlines.map(d => {
    const due = new Date(d.dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { ...d, daysUntil: diff, isPast: diff < 0 };
  });
}

export function getNextQuarterlyDeadline(): QuarterlyDeadline {
  const deadlines = getQuarterlyDeadlines();
  return deadlines.find(d => !d.isPast) || deadlines[deadlines.length - 1];
}
