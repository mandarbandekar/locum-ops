/**
 * Tax Constants V1 — 2025 Published Rates
 * Single source of truth for all tax calculations.
 * Nothing hardcoded elsewhere — everything references this file.
 */

export const TAX_CONSTANTS = {
  taxYear: 2025,

  // SE tax rates (1099 only)
  seNetRate: 0.9235,
  ssRate: 0.124,
  ssWageBase: 176100,
  medicareRate: 0.029,
  additionalMedicareRate: 0.009,
  additionalMedicareThreshold: { single: 200000, mfj: 250000, hoh: 200000 } as Record<string, number>,

  // Employer FICA (S-Corp only)
  employerFicaRate: 0.0765,

  // Standard deductions 2025
  standardDeduction: { single: 15000, mfj: 30000, hoh: 22500 } as Record<string, number>,

  // Standard mileage rate
  standardMileageRate: 0.70,

  // Federal brackets 2025
  federalBrackets: {
    single: [
      [11925,   0.10],
      [48475,   0.12],
      [103350,  0.22],
      [197300,  0.24],
      [250525,  0.32],
      [626350,  0.35],
      [Infinity, 0.37],
    ],
    mfj: [
      [23850,   0.10],
      [96950,   0.12],
      [206700,  0.22],
      [394600,  0.24],
      [501050,  0.32],
      [751600,  0.35],
      [Infinity, 0.37],
    ],
    hoh: [
      [17000,   0.10],
      [64850,   0.12],
      [103350,  0.22],
      [197300,  0.24],
      [250500,  0.32],
      [626350,  0.35],
      [Infinity, 0.37],
    ],
  } as Record<string, [number, number][]>,

  // State tax — progressive for CA and NY, flat for all others
  states: {
    // No income tax
    AK: { name: 'Alaska',        type: 'none' as const },
    FL: { name: 'Florida',       type: 'none' as const },
    NV: { name: 'Nevada',        type: 'none' as const },
    NH: { name: 'New Hampshire', type: 'none' as const },
    SD: { name: 'South Dakota',  type: 'none' as const },
    TN: { name: 'Tennessee',     type: 'none' as const },
    TX: { name: 'Texas',         type: 'none' as const },
    WA: { name: 'Washington',    type: 'none' as const },
    WY: { name: 'Wyoming',       type: 'none' as const },

    // Progressive — CA full brackets
    CA: {
      name: 'California', type: 'progressive' as const,
      stdDed: { single: 5202, mfj: 10404 } as Record<string, number>,
      brackets: {
        single: [
          [10412,   0.010], [24684,   0.020], [38959,   0.040],
          [54081,   0.060], [68350,   0.080], [349137,  0.093],
          [418961,  0.103], [698274,  0.113], [Infinity, 0.133],
        ],
        mfj: [
          [20824,   0.010], [49368,   0.020], [77918,   0.040],
          [108162,  0.060], [136700,  0.080], [698274,  0.093],
          [837922,  0.103], [1000000, 0.113], [Infinity, 0.133],
        ],
      } as Record<string, [number, number][]>,
    },

    // Progressive — NY full brackets
    NY: {
      name: 'New York', type: 'progressive' as const,
      stdDed: { single: 8000, mfj: 16050 } as Record<string, number>,
      brackets: {
        single: [
          [17150,    0.040], [23600,    0.045], [27900,   0.0525],
          [161550,   0.0585], [323200,  0.0625], [2155350, 0.0685],
          [5000000,  0.0965], [Infinity, 0.109],
        ],
        mfj: [
          [27900,    0.040], [43000,    0.045], [161550,  0.0525],
          [323200,   0.0585], [2155350, 0.0625], [Infinity, 0.0685],
        ],
      } as Record<string, [number, number][]>,
    },

    // Flat rate states — all others
    AL: { name: 'Alabama',        type: 'flat' as const, rate: 0.050 },
    AZ: { name: 'Arizona',        type: 'flat' as const, rate: 0.025 },
    AR: { name: 'Arkansas',       type: 'flat' as const, rate: 0.049 },
    CO: { name: 'Colorado',       type: 'flat' as const, rate: 0.044 },
    CT: { name: 'Connecticut',    type: 'flat' as const, rate: 0.065 },
    DE: { name: 'Delaware',       type: 'flat' as const, rate: 0.066 },
    GA: { name: 'Georgia',        type: 'flat' as const, rate: 0.055 },
    HI: { name: 'Hawaii',         type: 'flat' as const, rate: 0.080 },
    ID: { name: 'Idaho',          type: 'flat' as const, rate: 0.058 },
    IL: { name: 'Illinois',       type: 'flat' as const, rate: 0.0495 },
    IN: { name: 'Indiana',        type: 'flat' as const, rate: 0.030 },
    IA: { name: 'Iowa',           type: 'flat' as const, rate: 0.057 },
    KS: { name: 'Kansas',         type: 'flat' as const, rate: 0.057 },
    KY: { name: 'Kentucky',       type: 'flat' as const, rate: 0.045 },
    LA: { name: 'Louisiana',      type: 'flat' as const, rate: 0.042 },
    ME: { name: 'Maine',          type: 'flat' as const, rate: 0.075 },
    MD: { name: 'Maryland',       type: 'flat' as const, rate: 0.0575 },
    MA: { name: 'Massachusetts',  type: 'flat' as const, rate: 0.050 },
    MI: { name: 'Michigan',       type: 'flat' as const, rate: 0.0425 },
    MN: { name: 'Minnesota',      type: 'flat' as const, rate: 0.078 },
    MS: { name: 'Mississippi',    type: 'flat' as const, rate: 0.050 },
    MO: { name: 'Missouri',       type: 'flat' as const, rate: 0.054 },
    MT: { name: 'Montana',        type: 'flat' as const, rate: 0.059 },
    NE: { name: 'Nebraska',       type: 'flat' as const, rate: 0.0664 },
    NJ: { name: 'New Jersey',     type: 'flat' as const, rate: 0.0637 },
    NM: { name: 'New Mexico',     type: 'flat' as const, rate: 0.059 },
    NC: { name: 'North Carolina', type: 'flat' as const, rate: 0.0475 },
    ND: { name: 'North Dakota',   type: 'flat' as const, rate: 0.025 },
    OH: { name: 'Ohio',           type: 'flat' as const, rate: 0.040 },
    OK: { name: 'Oklahoma',       type: 'flat' as const, rate: 0.050 },
    OR: { name: 'Oregon',         type: 'flat' as const, rate: 0.0875 },
    PA: { name: 'Pennsylvania',   type: 'flat' as const, rate: 0.0307 },
    RI: { name: 'Rhode Island',   type: 'flat' as const, rate: 0.0475 },
    SC: { name: 'South Carolina', type: 'flat' as const, rate: 0.064 },
    UT: { name: 'Utah',           type: 'flat' as const, rate: 0.0465 },
    VT: { name: 'Vermont',        type: 'flat' as const, rate: 0.0875 },
    VA: { name: 'Virginia',       type: 'flat' as const, rate: 0.0575 },
    WV: { name: 'West Virginia',  type: 'flat' as const, rate: 0.065 },
    WI: { name: 'Wisconsin',      type: 'flat' as const, rate: 0.0765 },
    DC: { name: 'Washington DC',  type: 'flat' as const, rate: 0.085 },
  } as Record<string, { name: string; type: 'none' | 'flat' | 'progressive'; rate?: number; stdDed?: Record<string, number>; brackets?: Record<string, [number, number][]> }>,
};

export type V1FilingStatus = 'single' | 'mfj' | 'hoh';

export const V1_FILING_STATUS_LABELS: Record<V1FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married Filing Jointly',
  hoh: 'Head of Household',
};

// ── US States for dropdowns ─────────────────────────────
export const V1_US_STATES: { code: string; name: string }[] = Object.entries(TAX_CONSTANTS.states)
  .map(([code, s]) => ({ code, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ── Quarterly Due Dates ─────────────────────────────────
export function getV1QuarterlyDueDates(year: number) {
  return {
    1: { label: 'Q1', due: `${year}-04-15`, months: 'Jan–Mar' },
    2: { label: 'Q2', due: `${year}-06-16`, months: 'Apr–Jun' },
    3: { label: 'Q3', due: `${year}-09-15`, months: 'Jul–Sep' },
    4: { label: 'Q4', due: `${year + 1}-01-15`, months: 'Oct–Dec' },
  } as Record<number, { label: string; due: string; months: string }>;
}

// ── Retirement Limits (still 2025) ──────────────────────
export const V1_RETIREMENT_LIMITS = {
  sep_ira: { maxContribution: 70000, percentOfNet: 0.25 },
  solo_401k: { employeeMax: 23500, totalMax: 70000, employerPercent: 0.25 },
  simple_ira: { employeeMax: 16500, employerMatch: 0.03 },
};

// ── Disclaimer ──────────────────────────────────────────
export const V1_DISCLAIMER =
  'This estimate is for planning purposes only. It uses your inputs and 2025 published tax rates to give you a directional quarterly payment amount. It does not account for itemized deductions, tax credits, AMT, QBI pass-through deduction, PTE elections, or state-specific adjustments beyond income tax. Your actual tax liability may differ. Use this to set aside savings — confirm your exact payment with your CPA or tax advisor before filing.';
