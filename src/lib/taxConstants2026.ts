/**
 * Tax Constants for 2026 (per IRS Rev. Proc. 2025-32).
 * Single source of truth for all tax math.
 *
 * Filing status convention: long form everywhere.
 *   'single' | 'married_joint' | 'head_of_household'
 * (Matches the database column tax_intelligence_profiles.filing_status.)
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
  standardMileageRate: 0.70, // 2026 IRS standard mileage rate (Notice 2025-83)
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

// ── Retirement Limits (2026 — IRS Notice 2025-67) ──
export const RETIREMENT_LIMITS = {
  sep_ira: { maxContribution: 72000, percentOfNet: 0.25 },
  solo_401k: { employeeMax: 24500, totalMax: 72000, employerPercent: 0.25 },
  simple_ira: { employeeMax: 17000, employerMatch: 0.03 },
};

// ────────────────────────────────────────────────
// STATE TAX DATA
// Migrated from the legacy taxConstantsV1.ts for use by taxCalculatorV1.
// NOTE: For richer/more current state data (PTE, more brackets, more states)
// see src/lib/stateTaxData.ts. A future refactor should consolidate these.
// ────────────────────────────────────────────────

type StateBracketTuple = [number, number];

interface StateTaxEntryLegacy {
  name: string;
  type: 'none' | 'flat' | 'progressive';
  rate?: number;
  stdDed?: Record<string, number>;
  brackets?: Record<string, StateBracketTuple[]>;
}

export const STATE_TAX_DATA: Record<string, StateTaxEntryLegacy> = {
  // No income tax
  AK: { name: 'Alaska',        type: 'none' },
  FL: { name: 'Florida',       type: 'none' },
  NV: { name: 'Nevada',        type: 'none' },
  NH: { name: 'New Hampshire', type: 'none' },
  SD: { name: 'South Dakota',  type: 'none' },
  TN: { name: 'Tennessee',     type: 'none' },
  TX: { name: 'Texas',         type: 'none' },
  WA: { name: 'Washington',    type: 'none' },
  WY: { name: 'Wyoming',       type: 'none' },

  // Progressive — California
  CA: {
    name: 'California', type: 'progressive',
    stdDed: { single: 5202, married_joint: 10404 },
    brackets: {
      single: [
        [10412,   0.010], [24684,   0.020], [38959,   0.040],
        [54081,   0.060], [68350,   0.080], [349137,  0.093],
        [418961,  0.103], [698274,  0.113], [Infinity, 0.133],
      ],
      married_joint: [
        [20824,   0.010], [49368,   0.020], [77918,   0.040],
        [108162,  0.060], [136700,  0.080], [698274,  0.093],
        [837922,  0.103], [1000000, 0.113], [Infinity, 0.133],
      ],
    },
  },

  // Progressive — New York
  NY: {
    name: 'New York', type: 'progressive',
    stdDed: { single: 8000, married_joint: 16050 },
    brackets: {
      single: [
        [17150,    0.040], [23600,    0.045], [27900,   0.0525],
        [161550,   0.0585], [323200,  0.0625], [2155350, 0.0685],
        [5000000,  0.0965], [Infinity, 0.109],
      ],
      married_joint: [
        [27900,    0.040], [43000,    0.045], [161550,  0.0525],
        [323200,   0.0585], [2155350, 0.0625], [Infinity, 0.0685],
      ],
    },
  },

  // Flat rate states
  AL: { name: 'Alabama',        type: 'flat', rate: 0.050 },
  AZ: { name: 'Arizona',        type: 'flat', rate: 0.025 },
  AR: { name: 'Arkansas',       type: 'flat', rate: 0.049 },
  CO: { name: 'Colorado',       type: 'flat', rate: 0.044 },
  CT: { name: 'Connecticut',    type: 'flat', rate: 0.065 },
  DE: { name: 'Delaware',       type: 'flat', rate: 0.066 },
  GA: { name: 'Georgia',        type: 'flat', rate: 0.055 },
  HI: { name: 'Hawaii',         type: 'flat', rate: 0.080 },
  ID: { name: 'Idaho',          type: 'flat', rate: 0.058 },
  IL: { name: 'Illinois',       type: 'flat', rate: 0.0495 },
  IN: { name: 'Indiana',        type: 'flat', rate: 0.030 },
  IA: { name: 'Iowa',           type: 'flat', rate: 0.057 },
  KS: { name: 'Kansas',         type: 'flat', rate: 0.057 },
  KY: { name: 'Kentucky',       type: 'flat', rate: 0.045 },
  LA: { name: 'Louisiana',      type: 'flat', rate: 0.042 },
  ME: { name: 'Maine',          type: 'flat', rate: 0.075 },
  MD: { name: 'Maryland',       type: 'flat', rate: 0.0575 },
  MA: { name: 'Massachusetts',  type: 'flat', rate: 0.050 },
  MI: { name: 'Michigan',       type: 'flat', rate: 0.0425 },
  MN: { name: 'Minnesota',      type: 'flat', rate: 0.078 },
  MS: { name: 'Mississippi',    type: 'flat', rate: 0.050 },
  MO: { name: 'Missouri',       type: 'flat', rate: 0.054 },
  MT: { name: 'Montana',        type: 'flat', rate: 0.059 },
  NE: { name: 'Nebraska',       type: 'flat', rate: 0.0664 },
  NJ: { name: 'New Jersey',     type: 'flat', rate: 0.0637 },
  NM: { name: 'New Mexico',     type: 'flat', rate: 0.059 },
  NC: { name: 'North Carolina', type: 'flat', rate: 0.0475 },
  ND: { name: 'North Dakota',   type: 'flat', rate: 0.025 },
  OH: { name: 'Ohio',           type: 'flat', rate: 0.040 },
  OK: { name: 'Oklahoma',       type: 'flat', rate: 0.050 },
  OR: { name: 'Oregon',         type: 'flat', rate: 0.0875 },
  PA: { name: 'Pennsylvania',   type: 'flat', rate: 0.0307 },
  RI: { name: 'Rhode Island',   type: 'flat', rate: 0.0475 },
  SC: { name: 'South Carolina', type: 'flat', rate: 0.064 },
  UT: { name: 'Utah',           type: 'flat', rate: 0.0465 },
  VT: { name: 'Vermont',        type: 'flat', rate: 0.0875 },
  VA: { name: 'Virginia',       type: 'flat', rate: 0.0575 },
  WV: { name: 'West Virginia',  type: 'flat', rate: 0.065 },
  WI: { name: 'Wisconsin',      type: 'flat', rate: 0.0765 },
  DC: { name: 'Washington DC',  type: 'flat', rate: 0.085 },
};

// ────────────────────────────────────────────────
// LEGACY ALIASES (drop-in replacements for the old taxConstantsV1.ts API)
// New code should import named constants directly from this file instead.
// ────────────────────────────────────────────────

export type V1FilingStatus = FilingStatus;

export const V1_FILING_STATUS_LABELS: Record<V1FilingStatus, string> = FILING_STATUS_LABELS;

export const V1_US_STATES: { code: string; name: string }[] = Object.entries(STATE_TAX_DATA)
  .map(([code, s]) => ({ code, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getV1QuarterlyDueDates(year: number) {
  return getQuarterlyDueDates(year);
}

export const V1_RETIREMENT_LIMITS = RETIREMENT_LIMITS;

export const V1_DISCLAIMER =
  'This estimate is for planning purposes only. It uses your inputs and 2026 published tax rates to give you a directional quarterly payment amount. It does not account for itemized deductions, tax credits, AMT, QBI pass-through deduction, PTE elections, or state-specific adjustments beyond income tax. Your actual tax liability may differ. Use this to set aside savings — confirm your exact payment with your CPA or tax advisor before filing.';

// Convert the new {limit, rate}[] shape to the legacy [number, number][] shape
// the calculator expects.
function bracketsToTuples(brackets: typeof BRACKETS): Record<string, StateBracketTuple[]> {
  const out: Record<string, StateBracketTuple[]> = {};
  for (const [fs, arr] of Object.entries(brackets)) {
    out[fs] = arr.map(({ limit, rate }) => [limit, rate] as StateBracketTuple);
  }
  return out;
}

// Backward-compatible alias for taxCalculatorV1.ts.
export const TAX_CONSTANTS = {
  taxYear: TAX_YEAR,
  seNetRate: SE_TAXABLE_FACTOR,
  ssRate: SS_RATE,
  ssWageBase: SS_WAGE_CAP,
  medicareRate: MEDICARE_RATE,
  additionalMedicareRate: TAX_YEAR_CONFIG.additionalMedicareRate,
  additionalMedicareThreshold: TAX_YEAR_CONFIG.additionalMedicareThreshold,
  employerFicaRate: FICA_RATE,
  standardDeduction: STANDARD_DEDUCTIONS,
  standardMileageRate: TAX_YEAR_CONFIG.standardMileageRate,
  federalBrackets: bracketsToTuples(BRACKETS),
  states: STATE_TAX_DATA,
} as const;
