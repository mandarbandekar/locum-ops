import type { RateEntry } from '@/components/facilities/RatesEditor';

export type RateBasis = 'daily' | 'hourly';
export type BillingPreference = 'per_day' | 'per_hour' | 'both' | 'unsure';

export interface DefaultRate {
  id: string;
  name: string;
  amount: number;
  basis: RateBasis;
  active: boolean;
  sort_order: number;
}

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));

export const DAILY_PRESETS: Omit<DefaultRate, 'id'>[] = [
  { name: 'Standard Day', amount: 0, basis: 'daily', active: true, sort_order: 0 },
  { name: 'Weekend Day', amount: 0, basis: 'daily', active: true, sort_order: 1 },
  { name: 'Holiday Day', amount: 0, basis: 'daily', active: true, sort_order: 2 },
  { name: 'Emergency / On-call', amount: 0, basis: 'daily', active: true, sort_order: 3 },
];

export const HOURLY_PRESETS: Omit<DefaultRate, 'id'>[] = [
  { name: 'Standard Hour', amount: 0, basis: 'hourly', active: true, sort_order: 0 },
  { name: 'Weekend Hour', amount: 0, basis: 'hourly', active: true, sort_order: 1 },
  { name: 'Holiday Hour', amount: 0, basis: 'hourly', active: true, sort_order: 2 },
  { name: 'After-hours', amount: 0, basis: 'hourly', active: true, sort_order: 3 },
];

export function buildPresets(pref: BillingPreference): DefaultRate[] {
  const withIds = (rows: Omit<DefaultRate, 'id'>[]) =>
    rows.map(r => ({ ...r, id: newId() }));
  switch (pref) {
    case 'per_day':
    case 'unsure':
      return withIds(DAILY_PRESETS);
    case 'per_hour':
      return withIds(HOURLY_PRESETS);
    case 'both':
      return [...withIds(DAILY_PRESETS), ...withIds(HOURLY_PRESETS)];
  }
}

export function newBlankRate(basis: RateBasis, sort_order: number): DefaultRate {
  return { id: newId(), name: '', amount: 0, basis, active: true, sort_order };
}

/**
 * Map the user's Rate Card → RateEntry[] used by AddClinicStepper / RatesEditor.
 * - First daily rate becomes `weekday_rate` (kind 'flat')
 * - Remaining daily rates → custom flat entries
 * - All hourly rates → custom hourly entries (label preserved)
 */
export function mapDefaultRatesToRateEntries(defaults: DefaultRate[]): RateEntry[] {
  const active = defaults.filter(r => r.active && r.amount > 0 && r.name.trim());
  const daily = active.filter(r => r.basis === 'daily').sort((a, b) => a.sort_order - b.sort_order);
  const hourly = active.filter(r => r.basis === 'hourly').sort((a, b) => a.sort_order - b.sort_order);
  const out: RateEntry[] = [];

  daily.forEach((r, i) => {
    if (i === 0) {
      out.push({ type: 'weekday', label: 'Weekday Rate', amount: r.amount, kind: 'flat' });
    } else {
      out.push({ type: 'custom', label: r.name.trim(), amount: r.amount, kind: 'flat' });
    }
  });
  hourly.forEach(r => {
    out.push({ type: 'custom', label: r.name.trim(), amount: r.amount, kind: 'hourly' });
  });
  return out;
}

/**
 * Read-only: derive DefaultRate[] from a list of RateEntry[] (typically aggregated
 * from existing clinic terms). Used to **backfill** the Rate Card without ever
 * mutating clinic-specific rate records.
 *
 * - De-duplicates by (basis,label,amount)
 * - Preserves source labels
 * - Marks all entries active
 * - Sort order: dailies first, then hourlies, in input order
 */
export function buildDefaultRatesFromRateEntries(entries: RateEntry[]): DefaultRate[] {
  const seen = new Set<string>();
  const dailies: DefaultRate[] = [];
  const hourlies: DefaultRate[] = [];
  for (const r of entries) {
    const label = (r.label || '').trim();
    if (!label || !r.amount || r.amount <= 0) continue;
    const basis: RateBasis = r.kind === 'hourly' ? 'hourly' : 'daily';
    const key = `${basis}:${label.toLowerCase()}:${r.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rate: DefaultRate = {
      id: newId(),
      name: label,
      amount: r.amount,
      basis,
      active: true,
      sort_order: 0,
    };
    (basis === 'daily' ? dailies : hourlies).push(rate);
  }
  return [...dailies, ...hourlies].map((r, i) => ({ ...r, sort_order: i }));
}

/**
 * Infer a sensible BillingPreference from an existing rate entry list:
 * - only daily → 'per_day'
 * - only hourly → 'per_hour'
 * - mixed → 'both'
 * - empty → 'per_day' (safe default)
 */
export function inferBillingPreference(entries: RateEntry[]): BillingPreference {
  let hasDaily = false;
  let hasHourly = false;
  for (const r of entries) {
    if (!r.amount || r.amount <= 0) continue;
    if (r.kind === 'hourly') hasHourly = true;
    else hasDaily = true;
  }
  if (hasDaily && hasHourly) return 'both';
  if (hasHourly) return 'per_hour';
  return 'per_day';
}

export interface BulkRateOption {
  id: string;          // synthetic; tied to source basis+label
  label: string;       // "Standard Day — $850 /day"
  amount: number;      // dollars
  basis: RateBasis;
}

/**
 * Build the rate dropdown options for the Bulk Shift Calendar.
 * Pulls from the saved facility's terms snapshot if present, otherwise from the
 * user's default Rate Card.
 */
export function buildBulkRateOptions(opts: {
  rateEntries?: RateEntry[];
  defaultRates?: DefaultRate[];
}): BulkRateOption[] {
  const list: BulkRateOption[] = [];
  const seen = new Set<string>();
  const push = (label: string, amount: number, basis: RateBasis) => {
    const key = `${basis}:${label}:${amount}`;
    if (seen.has(key) || amount <= 0) return;
    seen.add(key);
    list.push({
      id: key,
      label: `${label} — $${amount.toLocaleString()} /${basis === 'daily' ? 'day' : 'hr'}`,
      amount,
      basis,
    });
  };

  // Prefer terms snapshot from the just-created facility
  if (opts.rateEntries && opts.rateEntries.length > 0) {
    for (const r of opts.rateEntries) {
      const basis: RateBasis = r.kind === 'hourly' ? 'hourly' : 'daily';
      push(r.label, r.amount, basis);
    }
  }

  // Fallback / supplement from default rate card
  if (opts.defaultRates && opts.defaultRates.length > 0) {
    const sorted = [...opts.defaultRates]
      .filter(r => r.active && r.amount > 0 && r.name.trim())
      .sort((a, b) =>
        a.basis === b.basis ? a.sort_order - b.sort_order : a.basis === 'daily' ? -1 : 1,
      );
    for (const r of sorted) {
      push(r.name.trim(), r.amount, r.basis);
    }
  }
  return list;
}
