/**
 * State Tax Data — 2026 projected rates.
 * Single source of truth for all state income tax calculations.
 * Updated annually each January.
 */

export type StateTaxType = 'none' | 'flat' | 'progressive';
export type StateFilingStatus = 'single' | 'mfj' | 'hoh';

interface Bracket { upTo: number; rate: number }

export interface StateTaxEntry {
  name: string;
  type: StateTaxType;
  rate?: number; // flat-rate states only
  standardDeduction?: Partial<Record<StateFilingStatus, number>>;
  brackets?: Partial<Record<StateFilingStatus, Bracket[]>>;
  hasPTE: boolean;
  pteRate?: number;
}

export const STATE_TAX_DATA: Record<string, StateTaxEntry> = {
  AL: {
    name: 'Alabama', type: 'progressive',
    standardDeduction: { single: 2500, mfj: 7500, hoh: 2500 },
    brackets: {
      single: [{ upTo: 500, rate: 0.02 }, { upTo: 3000, rate: 0.04 }, { upTo: Infinity, rate: 0.05 }],
      mfj: [{ upTo: 1000, rate: 0.02 }, { upTo: 6000, rate: 0.04 }, { upTo: Infinity, rate: 0.05 }],
    },
    hasPTE: false,
  },
  AK: { name: 'Alaska', type: 'none', hasPTE: false },
  AZ: {
    name: 'Arizona', type: 'flat', rate: 0.025, hasPTE: true, pteRate: 0.025,
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
  },
  AR: {
    name: 'Arkansas', type: 'progressive',
    standardDeduction: { single: 2340, mfj: 4680, hoh: 2340 },
    brackets: {
      single: [{ upTo: 4400, rate: 0.02 }, { upTo: 8800, rate: 0.04 }, { upTo: Infinity, rate: 0.044 }],
      mfj: [{ upTo: 4400, rate: 0.02 }, { upTo: 8800, rate: 0.04 }, { upTo: Infinity, rate: 0.044 }],
    },
    hasPTE: false,
  },
  CA: {
    name: 'California', type: 'progressive',
    standardDeduction: { single: 5363, mfj: 10726, hoh: 10726 },
    brackets: {
      single: [
        { upTo: 10412, rate: 0.01 }, { upTo: 24684, rate: 0.02 }, { upTo: 38959, rate: 0.04 },
        { upTo: 54081, rate: 0.06 }, { upTo: 68350, rate: 0.08 }, { upTo: 349137, rate: 0.093 },
        { upTo: 418961, rate: 0.103 }, { upTo: 698274, rate: 0.113 }, { upTo: Infinity, rate: 0.133 },
      ],
      mfj: [
        { upTo: 20824, rate: 0.01 }, { upTo: 49368, rate: 0.02 }, { upTo: 77918, rate: 0.04 },
        { upTo: 108162, rate: 0.06 }, { upTo: 136700, rate: 0.08 }, { upTo: 698274, rate: 0.093 },
        { upTo: 837922, rate: 0.103 }, { upTo: 1000000, rate: 0.113 }, { upTo: Infinity, rate: 0.133 },
      ],
    },
    hasPTE: true, pteRate: 0.093,
  },
  CO: {
    name: 'Colorado', type: 'flat', rate: 0.044, hasPTE: true, pteRate: 0.044,
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
  },
  CT: {
    name: 'Connecticut', type: 'progressive',
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
    brackets: {
      single: [
        { upTo: 10000, rate: 0.02 }, { upTo: 50000, rate: 0.045 }, { upTo: 100000, rate: 0.055 },
        { upTo: 200000, rate: 0.06 }, { upTo: 250000, rate: 0.065 }, { upTo: 500000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
      mfj: [
        { upTo: 20000, rate: 0.02 }, { upTo: 100000, rate: 0.045 }, { upTo: 200000, rate: 0.055 },
        { upTo: 400000, rate: 0.06 }, { upTo: 500000, rate: 0.065 }, { upTo: 1000000, rate: 0.069 },
        { upTo: Infinity, rate: 0.0699 },
      ],
    },
    hasPTE: true, pteRate: 0.0699,
  },
  DE: {
    name: 'Delaware', type: 'progressive',
    standardDeduction: { single: 3250, mfj: 6500, hoh: 3250 },
    brackets: {
      single: [
        { upTo: 2000, rate: 0.0 }, { upTo: 5000, rate: 0.022 }, { upTo: 10000, rate: 0.039 },
        { upTo: 20000, rate: 0.048 }, { upTo: 25000, rate: 0.052 }, { upTo: 60000, rate: 0.0555 },
        { upTo: Infinity, rate: 0.066 },
      ],
      mfj: [
        { upTo: 2000, rate: 0.0 }, { upTo: 5000, rate: 0.022 }, { upTo: 10000, rate: 0.039 },
        { upTo: 20000, rate: 0.048 }, { upTo: 25000, rate: 0.052 }, { upTo: 60000, rate: 0.0555 },
        { upTo: Infinity, rate: 0.066 },
      ],
    },
    hasPTE: false,
  },
  FL: { name: 'Florida', type: 'none', hasPTE: false },
  GA: {
    name: 'Georgia', type: 'flat', rate: 0.055, hasPTE: true, pteRate: 0.055,
    standardDeduction: { single: 12000, mfj: 24000, hoh: 12000 },
  },
  HI: {
    name: 'Hawaii', type: 'progressive',
    standardDeduction: { single: 2200, mfj: 4400, hoh: 3212 },
    brackets: {
      single: [
        { upTo: 2400, rate: 0.014 }, { upTo: 4800, rate: 0.032 }, { upTo: 9600, rate: 0.055 },
        { upTo: 14400, rate: 0.064 }, { upTo: 19200, rate: 0.068 }, { upTo: 24000, rate: 0.072 },
        { upTo: 36000, rate: 0.076 }, { upTo: 48000, rate: 0.079 }, { upTo: 150000, rate: 0.0825 },
        { upTo: 175000, rate: 0.09 }, { upTo: 200000, rate: 0.10 }, { upTo: Infinity, rate: 0.11 },
      ],
      mfj: [
        { upTo: 4800, rate: 0.014 }, { upTo: 9600, rate: 0.032 }, { upTo: 19200, rate: 0.055 },
        { upTo: 28800, rate: 0.064 }, { upTo: 38400, rate: 0.068 }, { upTo: 48000, rate: 0.072 },
        { upTo: 72000, rate: 0.076 }, { upTo: 96000, rate: 0.079 }, { upTo: 300000, rate: 0.0825 },
        { upTo: 350000, rate: 0.09 }, { upTo: 400000, rate: 0.10 }, { upTo: Infinity, rate: 0.11 },
      ],
    },
    hasPTE: false,
  },
  ID: {
    name: 'Idaho', type: 'flat', rate: 0.058, hasPTE: false,
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
  },
  IL: {
    name: 'Illinois', type: 'flat', rate: 0.0495, hasPTE: true, pteRate: 0.0495,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  IN: {
    name: 'Indiana', type: 'flat', rate: 0.0305, hasPTE: false,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  IA: {
    name: 'Iowa', type: 'flat', rate: 0.038, hasPTE: false,
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
  },
  KS: {
    name: 'Kansas', type: 'progressive',
    standardDeduction: { single: 3500, mfj: 8000, hoh: 6000 },
    brackets: {
      single: [{ upTo: 15000, rate: 0.031 }, { upTo: 30000, rate: 0.0525 }, { upTo: Infinity, rate: 0.057 }],
      mfj: [{ upTo: 30000, rate: 0.031 }, { upTo: 60000, rate: 0.0525 }, { upTo: Infinity, rate: 0.057 }],
    },
    hasPTE: true, pteRate: 0.057,
  },
  KY: {
    name: 'Kentucky', type: 'flat', rate: 0.04, hasPTE: false,
    standardDeduction: { single: 3160, mfj: 3160, hoh: 3160 },
  },
  LA: {
    name: 'Louisiana', type: 'progressive',
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
    brackets: {
      single: [{ upTo: 12500, rate: 0.0185 }, { upTo: 50000, rate: 0.035 }, { upTo: Infinity, rate: 0.0425 }],
      mfj: [{ upTo: 25000, rate: 0.0185 }, { upTo: 100000, rate: 0.035 }, { upTo: Infinity, rate: 0.0425 }],
    },
    hasPTE: false,
  },
  ME: {
    name: 'Maine', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [{ upTo: 24500, rate: 0.058 }, { upTo: 58050, rate: 0.0675 }, { upTo: Infinity, rate: 0.0715 }],
      mfj: [{ upTo: 49050, rate: 0.058 }, { upTo: 116100, rate: 0.0675 }, { upTo: Infinity, rate: 0.0715 }],
    },
    hasPTE: false,
  },
  MD: {
    name: 'Maryland', type: 'progressive',
    standardDeduction: { single: 2550, mfj: 5100, hoh: 2550 },
    brackets: {
      single: [
        { upTo: 1000, rate: 0.02 }, { upTo: 2000, rate: 0.03 }, { upTo: 3000, rate: 0.04 },
        { upTo: 100000, rate: 0.0475 }, { upTo: 125000, rate: 0.05 }, { upTo: 150000, rate: 0.0525 },
        { upTo: 250000, rate: 0.055 }, { upTo: Infinity, rate: 0.0575 },
      ],
      mfj: [
        { upTo: 1000, rate: 0.02 }, { upTo: 2000, rate: 0.03 }, { upTo: 3000, rate: 0.04 },
        { upTo: 150000, rate: 0.0475 }, { upTo: 175000, rate: 0.05 }, { upTo: 225000, rate: 0.0525 },
        { upTo: 300000, rate: 0.055 }, { upTo: Infinity, rate: 0.0575 },
      ],
    },
    hasPTE: true, pteRate: 0.0575,
  },
  MA: {
    name: 'Massachusetts', type: 'flat', rate: 0.05, hasPTE: true, pteRate: 0.05,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  MI: {
    name: 'Michigan', type: 'flat', rate: 0.0425, hasPTE: false,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  MN: {
    name: 'Minnesota', type: 'progressive',
    standardDeduction: { single: 14575, mfj: 29150, hoh: 21850 },
    brackets: {
      single: [{ upTo: 31690, rate: 0.0535 }, { upTo: 104090, rate: 0.068 }, { upTo: 183340, rate: 0.0785 }, { upTo: Infinity, rate: 0.0985 }],
      mfj: [{ upTo: 46330, rate: 0.0535 }, { upTo: 184040, rate: 0.068 }, { upTo: 321450, rate: 0.0785 }, { upTo: Infinity, rate: 0.0985 }],
    },
    hasPTE: true, pteRate: 0.0985,
  },
  MS: {
    name: 'Mississippi', type: 'flat', rate: 0.05, hasPTE: false,
    standardDeduction: { single: 2300, mfj: 4600, hoh: 3400 },
  },
  MO: {
    name: 'Missouri', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [
        { upTo: 1207, rate: 0.02 }, { upTo: 2414, rate: 0.025 }, { upTo: 3621, rate: 0.03 },
        { upTo: 4828, rate: 0.035 }, { upTo: 6035, rate: 0.04 }, { upTo: 7242, rate: 0.045 },
        { upTo: 8449, rate: 0.05 }, { upTo: Infinity, rate: 0.048 },
      ],
      mfj: [
        { upTo: 1207, rate: 0.02 }, { upTo: 2414, rate: 0.025 }, { upTo: 3621, rate: 0.03 },
        { upTo: 4828, rate: 0.035 }, { upTo: 6035, rate: 0.04 }, { upTo: 7242, rate: 0.045 },
        { upTo: 8449, rate: 0.05 }, { upTo: Infinity, rate: 0.048 },
      ],
    },
    hasPTE: true, pteRate: 0.048,
  },
  MT: {
    name: 'Montana', type: 'progressive',
    standardDeduction: { single: 5540, mfj: 11080, hoh: 5540 },
    brackets: {
      single: [{ upTo: 3600, rate: 0.01 }, { upTo: 6300, rate: 0.02 }, { upTo: 9700, rate: 0.03 }, { upTo: 13200, rate: 0.04 }, { upTo: 17100, rate: 0.05 }, { upTo: 22000, rate: 0.06 }, { upTo: Infinity, rate: 0.059 }],
      mfj: [{ upTo: 3600, rate: 0.01 }, { upTo: 6300, rate: 0.02 }, { upTo: 9700, rate: 0.03 }, { upTo: 13200, rate: 0.04 }, { upTo: 17100, rate: 0.05 }, { upTo: 22000, rate: 0.06 }, { upTo: Infinity, rate: 0.059 }],
    },
    hasPTE: false,
  },
  NE: {
    name: 'Nebraska', type: 'progressive',
    standardDeduction: { single: 7900, mfj: 15800, hoh: 11600 },
    brackets: {
      single: [{ upTo: 3700, rate: 0.0246 }, { upTo: 22170, rate: 0.0351 }, { upTo: 35730, rate: 0.0501 }, { upTo: Infinity, rate: 0.0584 }],
      mfj: [{ upTo: 7390, rate: 0.0246 }, { upTo: 44350, rate: 0.0351 }, { upTo: 71460, rate: 0.0501 }, { upTo: Infinity, rate: 0.0584 }],
    },
    hasPTE: false,
  },
  NV: { name: 'Nevada', type: 'none', hasPTE: false },
  NH: { name: 'New Hampshire', type: 'none', hasPTE: false },
  NJ: {
    name: 'New Jersey', type: 'progressive',
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
    brackets: {
      single: [
        { upTo: 20000, rate: 0.014 }, { upTo: 35000, rate: 0.0175 }, { upTo: 40000, rate: 0.035 },
        { upTo: 75000, rate: 0.05525 }, { upTo: 500000, rate: 0.0637 }, { upTo: Infinity, rate: 0.1075 },
      ],
      mfj: [
        { upTo: 20000, rate: 0.014 }, { upTo: 50000, rate: 0.0175 }, { upTo: 70000, rate: 0.0245 },
        { upTo: 80000, rate: 0.035 }, { upTo: 150000, rate: 0.05525 }, { upTo: 500000, rate: 0.0637 },
        { upTo: Infinity, rate: 0.1075 },
      ],
    },
    hasPTE: true, pteRate: 0.1075,
  },
  NM: {
    name: 'New Mexico', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [{ upTo: 5500, rate: 0.017 }, { upTo: 11000, rate: 0.032 }, { upTo: 16000, rate: 0.047 }, { upTo: 210000, rate: 0.049 }, { upTo: Infinity, rate: 0.059 }],
      mfj: [{ upTo: 8000, rate: 0.017 }, { upTo: 16000, rate: 0.032 }, { upTo: 24000, rate: 0.047 }, { upTo: 315000, rate: 0.049 }, { upTo: Infinity, rate: 0.059 }],
    },
    hasPTE: false,
  },
  NY: {
    name: 'New York', type: 'progressive',
    standardDeduction: { single: 8000, mfj: 16050, hoh: 11200 },
    brackets: {
      single: [
        { upTo: 17150, rate: 0.04 }, { upTo: 23600, rate: 0.045 }, { upTo: 27900, rate: 0.0525 },
        { upTo: 161550, rate: 0.0585 }, { upTo: 323200, rate: 0.0625 }, { upTo: 2155350, rate: 0.0685 },
        { upTo: 5000000, rate: 0.0965 }, { upTo: 25000000, rate: 0.103 }, { upTo: Infinity, rate: 0.109 },
      ],
      mfj: [
        { upTo: 27900, rate: 0.04 }, { upTo: 43000, rate: 0.045 }, { upTo: 161550, rate: 0.0525 },
        { upTo: 323200, rate: 0.0585 }, { upTo: 2155350, rate: 0.0625 }, { upTo: Infinity, rate: 0.0685 },
      ],
    },
    hasPTE: true, pteRate: 0.109,
  },
  NC: {
    name: 'North Carolina', type: 'flat', rate: 0.0475, hasPTE: true, pteRate: 0.0475,
    standardDeduction: { single: 12750, mfj: 25500, hoh: 19125 },
  },
  ND: {
    name: 'North Dakota', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [{ upTo: 44725, rate: 0.0 }, { upTo: 225975, rate: 0.0195 }, { upTo: Infinity, rate: 0.025 }],
      mfj: [{ upTo: 74750, rate: 0.0 }, { upTo: 275100, rate: 0.0195 }, { upTo: Infinity, rate: 0.025 }],
    },
    hasPTE: false,
  },
  OH: {
    name: 'Ohio', type: 'progressive',
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
    brackets: {
      single: [{ upTo: 26050, rate: 0.0 }, { upTo: 100000, rate: 0.02765 }, { upTo: Infinity, rate: 0.035 }],
      mfj: [{ upTo: 26050, rate: 0.0 }, { upTo: 100000, rate: 0.02765 }, { upTo: Infinity, rate: 0.035 }],
    },
    hasPTE: false,
  },
  OK: {
    name: 'Oklahoma', type: 'progressive',
    standardDeduction: { single: 6350, mfj: 12700, hoh: 9350 },
    brackets: {
      single: [
        { upTo: 1000, rate: 0.0025 }, { upTo: 2500, rate: 0.0075 }, { upTo: 3750, rate: 0.0175 },
        { upTo: 4900, rate: 0.0275 }, { upTo: 7200, rate: 0.0375 }, { upTo: Infinity, rate: 0.0475 },
      ],
      mfj: [
        { upTo: 2000, rate: 0.0025 }, { upTo: 5000, rate: 0.0075 }, { upTo: 7500, rate: 0.0175 },
        { upTo: 9800, rate: 0.0275 }, { upTo: 12200, rate: 0.0375 }, { upTo: Infinity, rate: 0.0475 },
      ],
    },
    hasPTE: false,
  },
  OR: {
    name: 'Oregon', type: 'progressive',
    standardDeduction: { single: 2490, mfj: 4975, hoh: 4010 },
    brackets: {
      single: [
        { upTo: 3750, rate: 0.0475 }, { upTo: 9450, rate: 0.0675 }, { upTo: 125000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
      mfj: [
        { upTo: 7500, rate: 0.0475 }, { upTo: 18900, rate: 0.0675 }, { upTo: 250000, rate: 0.0875 },
        { upTo: Infinity, rate: 0.099 },
      ],
    },
    hasPTE: true, pteRate: 0.09,
  },
  PA: {
    name: 'Pennsylvania', type: 'flat', rate: 0.0307, hasPTE: false,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  RI: {
    name: 'Rhode Island', type: 'progressive',
    standardDeduction: { single: 10550, mfj: 21100, hoh: 15800 },
    brackets: {
      single: [{ upTo: 73450, rate: 0.0375 }, { upTo: 166950, rate: 0.0475 }, { upTo: Infinity, rate: 0.0599 }],
      mfj: [{ upTo: 73450, rate: 0.0375 }, { upTo: 166950, rate: 0.0475 }, { upTo: Infinity, rate: 0.0599 }],
    },
    hasPTE: true, pteRate: 0.0599,
  },
  SC: {
    name: 'South Carolina', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [{ upTo: 3460, rate: 0.0 }, { upTo: 17330, rate: 0.03 }, { upTo: Infinity, rate: 0.065 }],
      mfj: [{ upTo: 3460, rate: 0.0 }, { upTo: 17330, rate: 0.03 }, { upTo: Infinity, rate: 0.065 }],
    },
    hasPTE: false,
  },
  SD: { name: 'South Dakota', type: 'none', hasPTE: false },
  TN: { name: 'Tennessee', type: 'none', hasPTE: false },
  TX: { name: 'Texas', type: 'none', hasPTE: false },
  UT: {
    name: 'Utah', type: 'flat', rate: 0.0465, hasPTE: false,
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
  },
  VT: {
    name: 'Vermont', type: 'progressive',
    standardDeduction: { single: 7000, mfj: 14000, hoh: 10500 },
    brackets: {
      single: [{ upTo: 45400, rate: 0.0335 }, { upTo: 110050, rate: 0.066 }, { upTo: 229550, rate: 0.076 }, { upTo: Infinity, rate: 0.0875 }],
      mfj: [{ upTo: 75850, rate: 0.0335 }, { upTo: 183400, rate: 0.066 }, { upTo: 279450, rate: 0.076 }, { upTo: Infinity, rate: 0.0875 }],
    },
    hasPTE: false,
  },
  VA: {
    name: 'Virginia', type: 'progressive',
    standardDeduction: { single: 8000, mfj: 16000, hoh: 8000 },
    brackets: {
      single: [
        { upTo: 3000, rate: 0.02 }, { upTo: 5000, rate: 0.03 }, { upTo: 17000, rate: 0.05 },
        { upTo: Infinity, rate: 0.0575 },
      ],
      mfj: [
        { upTo: 3000, rate: 0.02 }, { upTo: 5000, rate: 0.03 }, { upTo: 17000, rate: 0.05 },
        { upTo: Infinity, rate: 0.0575 },
      ],
    },
    hasPTE: true, pteRate: 0.0575,
  },
  WA: { name: 'Washington', type: 'none', hasPTE: false },
  WV: {
    name: 'West Virginia', type: 'progressive',
    standardDeduction: { single: 0, mfj: 0, hoh: 0 },
    brackets: {
      single: [{ upTo: 10000, rate: 0.0236 }, { upTo: 25000, rate: 0.0315 }, { upTo: 40000, rate: 0.0354 }, { upTo: 60000, rate: 0.0472 }, { upTo: Infinity, rate: 0.0512 }],
      mfj: [{ upTo: 10000, rate: 0.0236 }, { upTo: 25000, rate: 0.0315 }, { upTo: 40000, rate: 0.0354 }, { upTo: 60000, rate: 0.0472 }, { upTo: Infinity, rate: 0.0512 }],
    },
    hasPTE: false,
  },
  WI: {
    name: 'Wisconsin', type: 'progressive',
    standardDeduction: { single: 13230, mfj: 24410, hoh: 17030 },
    brackets: {
      single: [{ upTo: 14320, rate: 0.0354 }, { upTo: 28640, rate: 0.0465 }, { upTo: 315310, rate: 0.053 }, { upTo: Infinity, rate: 0.0765 }],
      mfj: [{ upTo: 19090, rate: 0.0354 }, { upTo: 38190, rate: 0.0465 }, { upTo: 420420, rate: 0.053 }, { upTo: Infinity, rate: 0.0765 }],
    },
    hasPTE: false,
  },
  WY: { name: 'Wyoming', type: 'none', hasPTE: false },
  DC: {
    name: 'District of Columbia', type: 'progressive',
    standardDeduction: { single: 14600, mfj: 29200, hoh: 21900 },
    brackets: {
      single: [
        { upTo: 10000, rate: 0.04 }, { upTo: 40000, rate: 0.06 }, { upTo: 60000, rate: 0.065 },
        { upTo: 250000, rate: 0.085 }, { upTo: 500000, rate: 0.0925 }, { upTo: 1000000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
      mfj: [
        { upTo: 10000, rate: 0.04 }, { upTo: 40000, rate: 0.06 }, { upTo: 60000, rate: 0.065 },
        { upTo: 250000, rate: 0.085 }, { upTo: 500000, rate: 0.0925 }, { upTo: 1000000, rate: 0.0975 },
        { upTo: Infinity, rate: 0.1075 },
      ],
    },
    hasPTE: true, pteRate: 0.1075,
  },
};

// ── Calculation Functions ────────────────────────────────

/**
 * Calculate state income tax using progressive brackets, flat rate, or none.
 * When PTE is elected for an S-Corp state that supports it, personal state tax = 0.
 */
export function applyStateBrackets(
  taxableIncome: number,
  filingStatus: string,
  stateKey: string,
  pteElected = false,
): number {
  const state = STATE_TAX_DATA[stateKey];
  if (!state || state.type === 'none') return 0;
  if (pteElected && state.hasPTE) return 0;

  const fs = (filingStatus === 'married_joint' ? 'mfj' : filingStatus === 'head_of_household' ? 'hoh' : 'single') as StateFilingStatus;
  const stateStdDed = state.standardDeduction?.[fs] ?? state.standardDeduction?.single ?? 0;
  const stateIncome = Math.max(0, taxableIncome - stateStdDed);

  if (state.type === 'flat') return Math.round(stateIncome * (state.rate ?? 0) * 100) / 100;

  const brackets = state.brackets?.[fs] ?? state.brackets?.single ?? [];
  let tax = 0, prev = 0;
  for (const { upTo, rate } of brackets) {
    if (stateIncome <= prev) break;
    tax += (Math.min(stateIncome, upTo) - prev) * rate;
    prev = upTo;
  }
  return Math.round(tax * 100) / 100;
}

/**
 * Get UI-friendly info about a state for callouts.
 */
export function getStateInfo(stateKey: string): { label: string; maxRate: string; pteLabel: string } | null {
  const state = STATE_TAX_DATA[stateKey];
  if (!state) return null;

  let label: string;
  let maxRate = '';
  if (state.type === 'none') {
    label = `${state.name} · No state income tax`;
  } else if (state.type === 'flat') {
    label = `${state.name} · Flat rate · ${(state.rate! * 100).toFixed(1)}%`;
    maxRate = `${(state.rate! * 100).toFixed(1)}%`;
  } else {
    const allBrackets = Object.values(state.brackets || {}).flat();
    const max = Math.max(...allBrackets.map(b => b.rate));
    maxRate = `${(max * 100).toFixed(1)}%`;
    label = `${state.name} · Progressive brackets · Up to ${maxRate}`;
  }

  const pteLabel = state.hasPTE
    ? `PTE tax available · ${((state.pteRate ?? 0) * 100).toFixed(1)}% entity-level rate`
    : '';

  return { label, maxRate, pteLabel };
}
