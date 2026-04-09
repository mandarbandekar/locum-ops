/**
 * Tax Constants for 2026 (projected).
 * Centralized for easy annual updates.
 */

export const TAX_YEAR = 2026;

export const TAX_YEAR_CONFIG = {
  activeYear: 2026,
  lastUpdated: '2026-04-08',
  nextUpdateDue: '2027-01-15',
  ssWageBase: 184500,
  seNetRate: 0.9235,
  seTaxRate: 0.153,
  additionalMedicareRate: 0.009,
  additionalMedicareThreshold: { single: 200000, married_joint: 250000, head_of_household: 200000 } as Record<string, number>,
  standardMileageRate: 0.725,
};

// ── Self-Employment ─────────────────────────────
export const SE_TAXABLE_FACTOR = 0.9235;
export const SS_RATE = 0.124;
export const MEDICARE_RATE = 0.029;
export const SE_TAX_RATE = SS_RATE + MEDICARE_RATE; // 15.3%
export const SS_WAGE_CAP = 184500;
export const FICA_RATE = 0.0765; // employee or employer side

// ── Filing Status ───────────────────────────────
export type FilingStatus = 'single' | 'married_joint' | 'head_of_household';

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  head_of_household: 'Head of Household',
};

export const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 16100,
  married_joint: 32200,
  head_of_household: 24150,
};

export const BRACKETS: Record<FilingStatus, { limit: number; rate: number }[]> = {
  single: [
    { limit: 12400, rate: 0.10 },
    { limit: 50400, rate: 0.12 },
    { limit: 105700, rate: 0.22 },
    { limit: 201775, rate: 0.24 },
    { limit: 256225, rate: 0.32 },
    { limit: 640600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { limit: 24800, rate: 0.10 },
    { limit: 100800, rate: 0.12 },
    { limit: 211400, rate: 0.22 },
    { limit: 403550, rate: 0.24 },
    { limit: 512450, rate: 0.32 },
    { limit: 768700, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { limit: 17700, rate: 0.10 },
    { limit: 67450, rate: 0.12 },
    { limit: 105700, rate: 0.22 },
    { limit: 201775, rate: 0.24 },
    { limit: 256200, rate: 0.32 },
    { limit: 640600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
};

// ── Federal Bracket Functions ───────────────────
export function applyFederalBrackets(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = BRACKETS[filingStatus] || BRACKETS.single;
  let tax = 0, prev = 0;
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, limit) - prev) * rate;
    prev = limit;
  }
  return Math.round(tax * 100) / 100;
}

export function getMarginalRate(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = BRACKETS[filingStatus] || BRACKETS.single;
  for (const { limit, rate } of brackets) {
    if (taxableIncome <= limit) return rate;
  }
  return 0.37;
}

// ── Quarterly Due Dates ─────────────────────────
export function getQuarterlyDueDates(year: number) {
  return {
    1: { label: 'Q1', due: `${year}-04-15`, months: 'Jan–Mar' },
    2: { label: 'Q2', due: `${year}-06-16`, months: 'Apr–Jun' },
    3: { label: 'Q3', due: `${year}-09-15`, months: 'Jul–Sep' },
    4: { label: 'Q4', due: `${year + 1}-01-15`, months: 'Oct–Dec' },
  } as Record<number, { label: string; due: string; months: string }>;
}

// ── US States (for dropdowns) ───────────────────
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

// ── Retirement Limits ───────────────────────────
export const RETIREMENT_LIMITS = {
  sep_ira: { maxContribution: 72000, percentOfNet: 0.25 },
  solo_401k: { employeeMax: 23500, totalMax: 72000, employerPercent: 0.25 },
  simple_ira: { employeeMax: 16500, employerMatch: 0.03 },
};
