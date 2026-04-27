import type { RateEntry } from '@/components/facilities/RatesEditor';

export type RateBasis = 'daily' | 'hourly';
export type BillingPreference = 'per_day' | 'per_hour' | 'both' | 'unsure';

export interface DefaultRate {
  id: string;
  name: string;
  amount: number;
  basis: RateBasis;
  /**
   * Optional shift-type slug (e.g. 'gp', 'er', 'surgery'). Free-form to support
   * custom values typed by the user. Carried into facility rate snapshots and
   * ultimately onto the saved shift record.
   */
  shift_type?: string;
  active: boolean;
  sort_order: number;
}

/**
 * Canonical shift-type catalog — used for the combobox in the Rate Card and
 * for chip-rendering on shift cards. Custom values typed by the user are
 * supported but won't appear in this list.
 */
export interface ShiftTypeOption {
  value: string;       // slug stored in DB
  label: string;       // human label for the chip
  short: string;       // short label used to autofill rate names ("GP Day")
}
export const SHIFT_TYPE_OPTIONS: ShiftTypeOption[] = [
  { value: 'gp',        label: 'GP / General Practice', short: 'GP' },
  { value: 'er',        label: 'ER / Emergency',         short: 'ER' },
  { value: 'surgery',   label: 'Surgery',                short: 'Surgery' },
  { value: 'dental',    label: 'Dental',                 short: 'Dental' },
  { value: 'wellness',  label: 'Wellness / Vaccine',     short: 'Wellness' },
  { value: 'oncall',    label: 'On-Call',                short: 'On-Call' },
  { value: 'telemed',   label: 'Telemedicine',           short: 'Telemed' },
  { value: 'specialty', label: 'Specialty / Referral',   short: 'Specialty' },
  { value: 'shelter',   label: 'Shelter / Nonprofit',    short: 'Shelter' },
  { value: 'other',     label: 'Other Relief',           short: 'Relief' },
];

export function getShiftTypeLabel(value?: string | null): string | null {
  if (!value) return null;
  const match = SHIFT_TYPE_OPTIONS.find(o => o.value === value);
  return match ? match.short : value;
}

export function getShiftTypeFullLabel(value?: string | null): string | null {
  if (!value) return null;
  const match = SHIFT_TYPE_OPTIONS.find(o => o.value === value);
  return match ? match.label : value;
}

/** Suggested rate name for a shift type + basis pairing (e.g. "ER Day"). */
export function suggestRateName(shiftType: string | undefined, basis: RateBasis): string {
  const short = shiftType
    ? (SHIFT_TYPE_OPTIONS.find(o => o.value === shiftType)?.short || shiftType)
    : '';
  if (!short) return '';
  return basis === 'daily' ? `${short} Day` : `${short} Hour`;
}

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));

export const DAILY_PRESETS: Omit<DefaultRate, 'id'>[] = [
  { name: 'GP Day',             amount: 0, basis: 'daily', shift_type: 'gp',       active: true, sort_order: 0 },
  { name: 'ER Day',             amount: 0, basis: 'daily', shift_type: 'er',       active: true, sort_order: 1 },
  { name: 'Surgery Day',        amount: 0, basis: 'daily', shift_type: 'surgery',  active: true, sort_order: 2 },
  { name: 'Emergency / On-Call', amount: 0, basis: 'daily', shift_type: 'oncall',  active: true, sort_order: 3 },
];

export const HOURLY_PRESETS: Omit<DefaultRate, 'id'>[] = [
  { name: 'GP Hour',     amount: 0, basis: 'hourly', shift_type: 'gp',     active: true, sort_order: 0 },
  { name: 'ER Hour',     amount: 0, basis: 'hourly', shift_type: 'er',     active: true, sort_order: 1 },
  { name: 'After-hours', amount: 0, basis: 'hourly', shift_type: 'oncall', active: true, sort_order: 2 },
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
 * - First daily rate becomes `weekday_rate` (kind 'flat'); its shift_type is preserved.
 * - Remaining daily rates → custom flat entries (with shift_type carried).
 * - All hourly rates → custom hourly entries (label + shift_type preserved).
 */
export function mapDefaultRatesToRateEntries(defaults: DefaultRate[]): RateEntry[] {
  const active = defaults.filter(r => r.active && r.amount > 0 && r.name.trim());
  const daily = active.filter(r => r.basis === 'daily').sort((a, b) => a.sort_order - b.sort_order);
  const hourly = active.filter(r => r.basis === 'hourly').sort((a, b) => a.sort_order - b.sort_order);
  const out: RateEntry[] = [];

  daily.forEach((r, i) => {
    if (i === 0) {
      out.push({ type: 'weekday', label: 'Weekday Rate', amount: r.amount, kind: 'flat', shift_type: r.shift_type });
    } else {
      out.push({ type: 'custom', label: r.name.trim(), amount: r.amount, kind: 'flat', shift_type: r.shift_type });
    }
  });
  hourly.forEach(r => {
    out.push({ type: 'custom', label: r.name.trim(), amount: r.amount, kind: 'hourly', shift_type: r.shift_type });
  });
  return out;
}

/**
 * Read-only: derive DefaultRate[] from a list of RateEntry[] (typically aggregated
 * from existing clinic terms). Used to **backfill** the Rate Card without ever
 * mutating clinic-specific rate records.
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
      shift_type: r.shift_type,
      active: true,
      sort_order: 0,
    };
    (basis === 'daily' ? dailies : hourlies).push(rate);
  }
  return [...dailies, ...hourlies].map((r, i) => ({ ...r, sort_order: i }));
}

/**
 * Infer a sensible BillingPreference from an existing rate entry list.
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
  label: string;       // "GP Day — $850 /day"
  amount: number;      // dollars
  basis: RateBasis;
  shift_type?: string;
}

/**
 * Build the rate dropdown options for the Bulk Shift Calendar.
 */
export function buildBulkRateOptions(opts: {
  rateEntries?: RateEntry[];
  defaultRates?: DefaultRate[];
}): BulkRateOption[] {
  const list: BulkRateOption[] = [];
  const seen = new Set<string>();
  const push = (label: string, amount: number, basis: RateBasis, shift_type?: string) => {
    const key = `${basis}:${label}:${amount}`;
    if (seen.has(key) || amount <= 0) return;
    seen.add(key);
    list.push({
      id: key,
      label: `${label} — $${amount.toLocaleString()} /${basis === 'daily' ? 'day' : 'hr'}`,
      amount,
      basis,
      shift_type,
    });
  };

  if (opts.rateEntries && opts.rateEntries.length > 0) {
    for (const r of opts.rateEntries) {
      const basis: RateBasis = r.kind === 'hourly' ? 'hourly' : 'daily';
      push(r.label, r.amount, basis, r.shift_type);
    }
  }

  if (opts.defaultRates && opts.defaultRates.length > 0) {
    const sorted = [...opts.defaultRates]
      .filter(r => r.active && r.amount > 0 && r.name.trim())
      .sort((a, b) =>
        a.basis === b.basis ? a.sort_order - b.sort_order : a.basis === 'daily' ? -1 : 1,
      );
    for (const r of sorted) {
      push(r.name.trim(), r.amount, r.basis, r.shift_type);
    }
  }
  return list;
}
