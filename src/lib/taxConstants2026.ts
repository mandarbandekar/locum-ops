/**
 * Tax Constants for 2026 (projected).
 * Centralized for easy annual updates.
 */

export const TAX_YEAR = 2026;

// ── Self-Employment ─────────────────────────────
export const SE_TAXABLE_FACTOR = 0.9235;
export const SS_RATE = 0.124;
export const MEDICARE_RATE = 0.029;
export const SE_TAX_RATE = SS_RATE + MEDICARE_RATE; // 15.3%
export const SS_WAGE_CAP = 174900;
export const FICA_RATE = 0.0765; // employee or employer side

// ── Filing Status ───────────────────────────────
export type FilingStatus = 'single' | 'married_joint' | 'head_of_household';

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  head_of_household: 'Head of Household',
};

export const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 15700,
  married_joint: 31400,
  head_of_household: 23500,
};

export const BRACKETS: Record<FilingStatus, { limit: number; rate: number }[]> = {
  single: [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { limit: 23850, rate: 0.10 },
    { limit: 96950, rate: 0.12 },
    { limit: 206700, rate: 0.22 },
    { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 },
    { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { limit: 17000, rate: 0.10 },
    { limit: 64850, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250500, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
};

// ── Quarterly Due Dates ─────────────────────────
export function getQuarterlyDueDates(year: number) {
  return {
    1: { label: 'Q1', due: `${year}-04-15`, months: 'Jan–Mar' },
    2: { label: 'Q2', due: `${year}-06-16`, months: 'Apr–Jun' },
    3: { label: 'Q3', due: `${year}-09-15`, months: 'Jul–Sep' },
    4: { label: 'Q4', due: `${year + 1}-01-15`, months: 'Oct–Dec' },
  } as Record<number, { label: string; due: string; months: string }>;
}

// ── State Tax Rates (approximate marginal) ──────
export const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05, AK: 0, AZ: 0.025, AR: 0.044, CA: 0.093,
  CO: 0.044, CT: 0.065, DE: 0.066, FL: 0, GA: 0.055,
  HI: 0.079, ID: 0.058, IL: 0.0495, IN: 0.0305, IA: 0.057,
  KS: 0.057, KY: 0.04, LA: 0.0425, ME: 0.0715, MD: 0.0575,
  MA: 0.05, MI: 0.0425, MN: 0.0785, MS: 0.05, MO: 0.048,
  MT: 0.059, NE: 0.0584, NV: 0, NH: 0, NJ: 0.0637,
  NM: 0.049, NY: 0.0685, NC: 0.0475, ND: 0.0195, OH: 0.035,
  OK: 0.0475, OR: 0.09, PA: 0.0307, RI: 0.0599, SC: 0.065,
  SD: 0, TN: 0, TX: 0, UT: 0.0465, VT: 0.066,
  VA: 0.0575, WA: 0, WV: 0.052, WI: 0.0627, WY: 0,
  DC: 0.085,
};

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
  sep_ira: { maxContribution: 69000, percentOfNet: 0.25 },
  solo_401k: { employeeMax: 23000, totalMax: 69000, employerPercent: 0.25 },
  simple_ira: { employeeMax: 16000, employerMatch: 0.03 },
};
