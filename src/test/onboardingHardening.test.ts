import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildBulkRateOptions,
  buildDefaultRatesFromRateEntries,
  inferBillingPreference,
  type DefaultRate,
} from '@/lib/onboardingRateMapping';
import {
  ratesToTermsFields,
  termsToRates,
  type RateEntry,
} from '@/components/facilities/RatesEditor';
import {
  maybeTrackActivation,
  _resetOnboardingActivationLatch,
} from '@/lib/onboardingAnalytics';
import { posthog } from '@/lib/posthog';
import { buildAutoInvoiceDraft } from '@/lib/invoiceAutoGeneration';

// ─── Legacy auto-complete predicate ────────────────────────────────
// Mirrors the gate in OnboardingPage.tsx so the rule is locked in by tests
// independently of React hook plumbing.
function shouldLegacyAutoComplete(input: {
  onboarding_completed_at: string | null;
  facilitiesCount: number;
  shiftsCount: number;
  invoicesCount: number;
}): boolean {
  if (input.onboarding_completed_at) return false;
  return (
    input.facilitiesCount > 0 &&
    (input.shiftsCount > 0 || input.invoicesCount > 0)
  );
}

describe('Legacy auto-complete gating', () => {
  it('does not trigger when onboarding is already completed', () => {
    expect(
      shouldLegacyAutoComplete({
        onboarding_completed_at: '2026-01-01T00:00:00Z',
        facilitiesCount: 5,
        shiftsCount: 10,
        invoicesCount: 3,
      }),
    ).toBe(false);
  });

  it('does not trigger for net-new users with no data', () => {
    expect(
      shouldLegacyAutoComplete({
        onboarding_completed_at: null,
        facilitiesCount: 0,
        shiftsCount: 0,
        invoicesCount: 0,
      }),
    ).toBe(false);
  });

  it('does not trigger when only facilities exist (no shifts/invoices)', () => {
    expect(
      shouldLegacyAutoComplete({
        onboarding_completed_at: null,
        facilitiesCount: 2,
        shiftsCount: 0,
        invoicesCount: 0,
      }),
    ).toBe(false);
  });

  it('triggers for legacy users with facilities + shifts but no completion timestamp', () => {
    expect(
      shouldLegacyAutoComplete({
        onboarding_completed_at: null,
        facilitiesCount: 1,
        shiftsCount: 4,
        invoicesCount: 0,
      }),
    ).toBe(true);
  });

  it('triggers for legacy users with facilities + invoices but no shifts', () => {
    expect(
      shouldLegacyAutoComplete({
        onboarding_completed_at: null,
        facilitiesCount: 1,
        shiftsCount: 0,
        invoicesCount: 2,
      }),
    ).toBe(true);
  });
});

// ─── Skip Rate Card → new clinic → bulk shifts dropdown ────────────
describe('Skip → new clinic → bulk shifts rate dropdown', () => {
  it('uses brand-new clinic rate entries when present (clinic-specific authoritative)', () => {
    const opts = buildBulkRateOptions({
      rateEntries: [
        { type: 'weekday', label: 'Weekday Rate', amount: 800, kind: 'flat' },
        { type: 'custom', label: 'Weekend', amount: 950, kind: 'flat' },
      ],
      defaultRates: [],
    });
    expect(opts).toHaveLength(2);
    expect(opts[0]).toMatchObject({ amount: 800, basis: 'daily' });
    expect(opts[0].label).toContain('Weekday Rate');
    expect(opts[0].label).toContain('$800');
    expect(opts[0].label).toContain('/day');
  });

  it('falls back to existing clinic-derived defaults when user skipped Rate Card and new clinic has no rates', () => {
    // Simulates: user skipped Rate Card but had OTHER clinics with rates;
    // OnboardingPage passes those derived rates as `defaultRates`.
    const derived = buildDefaultRatesFromRateEntries([
      { type: 'weekday', label: 'Weekday Rate', amount: 825, kind: 'flat' },
      { type: 'custom', label: 'Saturday', amount: 1000, kind: 'flat' },
      { type: 'custom', label: 'Per Hour', amount: 120, kind: 'hourly' },
    ]);
    const opts = buildBulkRateOptions({
      rateEntries: [], // brand new clinic, no terms yet
      defaultRates: derived,
    });
    expect(opts.length).toBeGreaterThanOrEqual(3);
    const amounts = opts.map(o => o.amount).sort((a, b) => a - b);
    expect(amounts).toContain(825);
    expect(amounts).toContain(1000);
    expect(amounts).toContain(120);
    // Daily entries should sort before hourly entries
    const firstHourlyIdx = opts.findIndex(o => o.basis === 'hourly');
    const lastDailyIdx = [...opts].map(o => o.basis).lastIndexOf('daily');
    expect(firstHourlyIdx).toBeGreaterThan(lastDailyIdx);
  });

  it('returns empty list when both sources are empty (component then applies hard fallback)', () => {
    const opts = buildBulkRateOptions({ rateEntries: [], defaultRates: [] });
    // Component-level safety net (Standard Day $850) lives in
    // OnboardingBulkShiftCalendar; the helper itself returns [].
    expect(opts).toEqual([]);
  });

  it('de-duplicates between rateEntries and defaultRates', () => {
    const dup: DefaultRate[] = [
      { id: 'd1', name: 'Weekday Rate', amount: 800, basis: 'daily', active: true, sort_order: 0 },
    ];
    const opts = buildBulkRateOptions({
      rateEntries: [{ type: 'weekday', label: 'Weekday Rate', amount: 800, kind: 'flat' }],
      defaultRates: dup,
    });
    expect(opts).toHaveLength(1);
  });

  it('skips inactive or zero-amount default rates', () => {
    const defaults: DefaultRate[] = [
      { id: '1', name: 'Active', amount: 700, basis: 'daily', active: true, sort_order: 0 },
      { id: '2', name: 'Inactive', amount: 700, basis: 'daily', active: false, sort_order: 1 },
      { id: '3', name: 'Zero', amount: 0, basis: 'daily', active: true, sort_order: 2 },
    ];
    const opts = buildBulkRateOptions({ rateEntries: [], defaultRates: defaults });
    expect(opts).toHaveLength(1);
    expect(opts[0].label).toContain('Active');
  });

  it('inferBillingPreference handles mixed clinic histories (skip-path billing default)', () => {
    expect(
      inferBillingPreference([
        { type: 'weekday', label: 'Day', amount: 800, kind: 'flat' },
        { type: 'custom', label: 'Hour', amount: 100, kind: 'hourly' },
      ]),
    ).toBe('both');
    expect(
      inferBillingPreference([{ type: 'custom', label: 'Hour', amount: 100, kind: 'hourly' }]),
    ).toBe('per_hour');
    expect(inferBillingPreference([])).toBe('per_day');
  });
});

// ─── Activation event pathway values ───────────────────────────────
describe('maybeTrackActivation pathway property', () => {
  let captureSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetOnboardingActivationLatch();
    captureSpy = vi.spyOn(posthog, 'capture').mockImplementation(() => undefined as any);
  });

  it('does not fire when criteria are not met', () => {
    maybeTrackActivation({
      rateCardCompleted: true,
      clinicCount: 1,
      shiftCount: 1, // needs >= 2
      invoiceRevealSeen: true,
      draftInvoiceCount: 0,
      projectedGross: 0,
    });
    expect(captureSpy).not.toHaveBeenCalled();
  });

  it('fires with pathway="standard" when rate card is completed', () => {
    maybeTrackActivation({
      rateCardCompleted: true,
      clinicCount: 1,
      shiftCount: 3,
      invoiceRevealSeen: true,
      draftInvoiceCount: 1,
      projectedGross: 2400.7,
    });
    expect(captureSpy).toHaveBeenCalledTimes(1);
    const [event, props] = captureSpy.mock.calls[0];
    expect(event).toBe('onboarding_activation_reached');
    expect(props).toMatchObject({
      pathway: 'standard',
      clinic_count: 1,
      shift_count: 3,
      draft_invoice_count: 1,
      projected_gross: 2401, // rounded
    });
  });

  it('fires with pathway="skip" when rate card was skipped (existing-user path)', () => {
    maybeTrackActivation({
      rateCardCompleted: false,
      rateCardSkipped: true,
      clinicCount: 2,
      shiftCount: 4,
      invoiceRevealSeen: true,
      draftInvoiceCount: 2,
      projectedGross: 5000,
    });
    expect(captureSpy).toHaveBeenCalledTimes(1);
    const [, props] = captureSpy.mock.calls[0];
    expect(props).toMatchObject({ pathway: 'skip', clinic_count: 2, shift_count: 4 });
  });

  it('fires even without rate card flags (Rate Card is now optional)', () => {
    maybeTrackActivation({
      rateCardCompleted: false,
      // rateCardSkipped omitted
      clinicCount: 1,
      shiftCount: 2,
      invoiceRevealSeen: true,
      draftInvoiceCount: 0,
      projectedGross: 0,
    });
    expect(captureSpy).toHaveBeenCalledTimes(1);
    const [, props] = captureSpy.mock.calls[0];
    expect(props).toMatchObject({ pathway: 'skip', clinic_count: 1, shift_count: 2 });
  });

  it('latches: only fires once per session even on repeated calls', () => {
    const input = {
      rateCardCompleted: true,
      clinicCount: 1,
      shiftCount: 2,
      invoiceRevealSeen: true,
      draftInvoiceCount: 1,
      projectedGross: 1000,
    };
    maybeTrackActivation(input);
    maybeTrackActivation(input);
    maybeTrackActivation(input);
    expect(captureSpy).toHaveBeenCalledTimes(1);
  });

  it('reset helper allows the latch to fire again (test-only)', () => {
    const input = {
      rateCardCompleted: true,
      clinicCount: 1,
      shiftCount: 2,
      invoiceRevealSeen: true,
      draftInvoiceCount: 1,
      projectedGross: 1000,
    };
    maybeTrackActivation(input);
    _resetOnboardingActivationLatch();
    maybeTrackActivation(input);
    expect(captureSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── Per-clinic rate persistence: schema round-trip ────────────────
// Locks in the columns the frontend writes to `terms_snapshots`. If a future
// change adds a new field on the RateEntry side without a matching DB column,
// this test surfaces it before it silently breaks onboarding (see the
// `rate_shift_types` regression).
describe('Per-clinic rate snapshot round-trip', () => {
  // Mirrors the live `terms_snapshots` schema. Update intentionally when
  // running a real migration, never just to make the test pass.
  const ALLOWED_TERMS_COLUMNS = new Set([
    'weekday_rate',
    'weekend_rate',
    'partial_day_rate',
    'holiday_rate',
    'telemedicine_rate',
    'custom_rates',
    'rate_kinds',
    'rate_shift_types',
  ]);

  it('only emits fields that exist on the terms_snapshots table', () => {
    const rates: RateEntry[] = [
      { type: 'weekday', label: 'Weekday Rate', amount: 850, kind: 'flat', shift_type: 'gp' },
      { type: 'custom', label: 'After-hours', amount: 160, kind: 'hourly', shift_type: 'er' },
    ];
    const fields = ratesToTermsFields(rates);
    for (const key of Object.keys(fields)) {
      expect(ALLOWED_TERMS_COLUMNS.has(key)).toBe(true);
    }
  });

  it('round-trips a saved hourly rate back through the bulk-shift picker', () => {
    const rates: RateEntry[] = [
      { type: 'custom', label: 'GP Hour', amount: 160, kind: 'hourly', shift_type: 'gp' },
    ];
    const fields = ratesToTermsFields(rates);
    // Simulate what comes back from the DB after insert.
    const stored = {
      weekday_rate: fields.weekday_rate,
      weekend_rate: fields.weekend_rate,
      partial_day_rate: fields.partial_day_rate,
      holiday_rate: fields.holiday_rate,
      telemedicine_rate: fields.telemedicine_rate,
      custom_rates: fields.custom_rates,
      rate_kinds: fields.rate_kinds,
      rate_shift_types: fields.rate_shift_types,
    };
    const rebuilt = termsToRates(stored);
    const options = buildBulkRateOptions({ rateEntries: rebuilt, defaultRates: [] });
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      label: 'GP Hour — $160 /hr',
      amount: 160,
      basis: 'hourly',
    });
  });
});

// ─── Onboarding regression: clinic rate → shift applied rate ──────
// Locks in the full path a brand-new user takes during onboarding:
//   1. Save rates on the new clinic (terms_snapshots round-trip).
//   2. Pick that clinic's rate in the bulk-shift calendar.
//   3. The created shift's `rate_applied` (and `hourly_rate` for hourly)
//      must equal the stored clinic rate exactly.
//
// Mirrors the mapping in `OnboardingBulkShiftCalendar.tsx` (lines ~250-269).
// If the shipped mapping changes, update this helper deliberately so the
// regression remains meaningful.
describe('Onboarding regression: clinic rate persists into shift', () => {
  type BulkRateOption = ReturnType<typeof buildBulkRateOptions>[number];

  function simulateShiftFromBulkPick(opts: {
    selectedRate: BulkRateOption;
    hoursPerShift: number;
  }) {
    const { selectedRate, hoursPerShift } = opts;
    const rate_applied =
      selectedRate.basis === 'daily'
        ? selectedRate.amount
        : selectedRate.amount * hoursPerShift;
    const rate_kind = selectedRate.basis === 'daily' ? 'flat' : 'hourly';
    const hourly_rate =
      selectedRate.basis === 'hourly' ? selectedRate.amount : null;
    return { rate_applied, rate_kind, hourly_rate };
  }

  function persistRatesAndReload(rates: RateEntry[]) {
    // Frontend: serialize for `terms_snapshots`.
    const fields = ratesToTermsFields(rates);
    // DB: store and read back (only the columns that actually exist).
    const stored = {
      weekday_rate: fields.weekday_rate,
      weekend_rate: fields.weekend_rate,
      partial_day_rate: fields.partial_day_rate,
      holiday_rate: fields.holiday_rate,
      telemedicine_rate: fields.telemedicine_rate,
      custom_rates: fields.custom_rates,
      rate_kinds: fields.rate_kinds,
      rate_shift_types: fields.rate_shift_types,
    };
    // Frontend: hydrate back into RateEntry[] (clinic-specific authoritative).
    return termsToRates(stored);
  }

  it('flat day rate saved on the clinic flows through to the shift unchanged', () => {
    // 1. Onboarding: user adds a clinic with an $850 weekday flat rate.
    const enteredRates: RateEntry[] = [
      { type: 'weekday', label: 'Weekday Rate', amount: 850, kind: 'flat', shift_type: 'gp' },
    ];
    const reloaded = persistRatesAndReload(enteredRates);

    // 2. The clinic's stored rate is what the bulk-shift picker offers.
    const options = buildBulkRateOptions({
      rateEntries: reloaded,
      defaultRates: [],
    });
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ amount: 850, basis: 'daily' });

    // 3. User picks that single option and creates a shift.
    const shift = simulateShiftFromBulkPick({
      selectedRate: options[0],
      hoursPerShift: 10, // irrelevant for a flat day rate
    });

    // The applied rate on the shift must equal the stored clinic rate.
    expect(shift.rate_applied).toBe(850);
    expect(shift.rate_kind).toBe('flat');
    expect(shift.hourly_rate).toBeNull();
  });

  it('hourly rate saved on the clinic flows through to the shift (rate × hours)', () => {
    // Reproduces the mandarbandekar9@gmail.com regression: user enters $160/hr
    // for the clinic and expects the shift to bill at $160/hr — not the
    // legacy $850/day fallback.
    const enteredRates: RateEntry[] = [
      { type: 'custom', label: 'GP Hour', amount: 160, kind: 'hourly', shift_type: 'gp' },
    ];
    const reloaded = persistRatesAndReload(enteredRates);

    const options = buildBulkRateOptions({
      rateEntries: reloaded,
      defaultRates: [],
    });
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ amount: 160, basis: 'hourly' });

    const shift = simulateShiftFromBulkPick({
      selectedRate: options[0],
      hoursPerShift: 10,
    });

    // hourly_rate on the shift must equal the stored clinic rate exactly.
    expect(shift.hourly_rate).toBe(160);
    expect(shift.rate_kind).toBe('hourly');
    // rate_applied is rate × hours, not the legacy flat $850 fallback.
    expect(shift.rate_applied).toBe(160 * 10);
    expect(shift.rate_applied).not.toBe(850);
  });

  it('mixed clinic rates: each pick maps to its own stored amount', () => {
    const enteredRates: RateEntry[] = [
      { type: 'weekday', label: 'Weekday Rate', amount: 900, kind: 'flat', shift_type: 'gp' },
      { type: 'weekend', label: 'Weekend Rate', amount: 1100, kind: 'flat', shift_type: 'gp' },
      { type: 'custom', label: 'After-hours', amount: 175, kind: 'hourly', shift_type: 'er' },
    ];
    const reloaded = persistRatesAndReload(enteredRates);
    const options = buildBulkRateOptions({
      rateEntries: reloaded,
      defaultRates: [],
    });
    expect(options.length).toBe(3);

    const byAmount = new Map(options.map((o) => [o.amount, o]));
    const weekday = byAmount.get(900)!;
    const weekend = byAmount.get(1100)!;
    const hourly = byAmount.get(175)!;
    expect(weekday.basis).toBe('daily');
    expect(weekend.basis).toBe('daily');
    expect(hourly.basis).toBe('hourly');

    // Pick weekday → flat $900 day.
    expect(simulateShiftFromBulkPick({ selectedRate: weekday, hoursPerShift: 10 }))
      .toMatchObject({ rate_applied: 900, rate_kind: 'flat', hourly_rate: null });

    // Pick weekend → flat $1100 day.
    expect(simulateShiftFromBulkPick({ selectedRate: weekend, hoursPerShift: 8 }))
      .toMatchObject({ rate_applied: 1100, rate_kind: 'flat', hourly_rate: null });

    // Pick hourly → $175/hr × 9 hours.
    expect(simulateShiftFromBulkPick({ selectedRate: hourly, hoursPerShift: 9 }))
      .toMatchObject({ rate_applied: 175 * 9, rate_kind: 'hourly', hourly_rate: 175 });
  });
});

// ─── Onboarding regression: shift rate → invoice line item ────────
// Locks in the next link in the chain: shifts created during onboarding must
// flow into the auto-generated invoice with `unit_rate` matching the shift's
// applied rate exactly. Catches regressions where invoice generation rounds,
// re-derives, or substitutes a different rate than what was logged on the
// shift.
describe('Onboarding regression: shift rate persists into invoice line', () => {
  type BulkRateOption = ReturnType<typeof buildBulkRateOptions>[number];

  function shiftFromBulkPick(args: {
    id: string;
    facility_id: string;
    date: string; // YYYY-MM-DD
    selectedRate: BulkRateOption;
    hoursPerShift: number;
  }) {
    const { id, facility_id, date, selectedRate, hoursPerShift } = args;
    const start = `${date}T09:00:00.000Z`;
    const endHour = 9 + hoursPerShift;
    const end = `${date}T${String(endHour).padStart(2, '0')}:00:00.000Z`;
    const rate_applied =
      selectedRate.basis === 'daily'
        ? selectedRate.amount
        : selectedRate.amount * hoursPerShift;
    return {
      id,
      facility_id,
      start_datetime: start,
      end_datetime: end,
      rate_applied,
      notes: '',
      color: 'green' as const,
      rate_kind: (selectedRate.basis === 'daily' ? 'flat' : 'hourly') as
        | 'flat'
        | 'hourly',
      hourly_rate:
        selectedRate.basis === 'hourly' ? selectedRate.amount : null,
      shift_type: null,
      engagement_type_override: null,
      source_name_override: null,
      break_minutes: 0,
      worked_through_break: true,
    };
  }

  // Minimal Facility shape required by buildAutoInvoiceDraft.
  const facility = {
    id: 'fac-1',
    name: 'Oakridge Veterinary Clinic',
    invoice_due_days: 15,
    invoice_prefix: 'INV',
  } as unknown as Parameters<typeof buildAutoInvoiceDraft>[0];

  it('flat day-rate shifts produce line items with unit_rate === rate_applied', () => {
    // Onboarding setup: $850 weekday flat saved on the clinic.
    const reloaded = termsToRates({
      ...ratesToTermsFields([
        { type: 'weekday', label: 'Weekday Rate', amount: 850, kind: 'flat' },
      ]),
    });
    const [option] = buildBulkRateOptions({ rateEntries: reloaded, defaultRates: [] });

    const shifts = ['2026-05-04', '2026-05-05', '2026-05-06'].map((d, i) =>
      shiftFromBulkPick({
        id: `s-${i}`,
        facility_id: facility.id,
        date: d,
        selectedRate: option,
        hoursPerShift: 10,
      }),
    );

    const { lineItems, invoice } = buildAutoInvoiceDraft(
      facility,
      shifts as unknown as Parameters<typeof buildAutoInvoiceDraft>[1],
      new Date('2026-05-01T00:00:00Z'),
      new Date('2026-05-31T23:59:59Z'),
      'INV-001',
    );

    expect(lineItems).toHaveLength(shifts.length);
    lineItems.forEach((li, i) => {
      expect(li.shift_id).toBe(shifts[i].id);
      expect(li.unit_rate).toBe(shifts[i].rate_applied);
      expect(li.unit_rate).toBe(850);
      expect(li.qty).toBe(1);
      expect(li.line_total).toBe(850);
      expect(li.line_kind).toBe('flat');
    });
    expect(invoice.total_amount).toBe(850 * shifts.length);
  });

  it('hourly shifts produce line items with unit_rate === hourly_rate (not rate_applied)', () => {
    // Onboarding setup: $160/hr saved on the clinic.
    const reloaded = termsToRates({
      ...ratesToTermsFields([
        { type: 'custom', label: 'GP Hour', amount: 160, kind: 'hourly' },
      ]),
    });
    const [option] = buildBulkRateOptions({ rateEntries: reloaded, defaultRates: [] });

    const shifts = ['2026-06-01', '2026-06-02'].map((d, i) =>
      shiftFromBulkPick({
        id: `h-${i}`,
        facility_id: facility.id,
        date: d,
        selectedRate: option,
        hoursPerShift: 10,
      }),
    );

    const { lineItems } = buildAutoInvoiceDraft(
      facility,
      shifts as unknown as Parameters<typeof buildAutoInvoiceDraft>[1],
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-30T23:59:59Z'),
      'INV-002',
    );

    expect(lineItems).toHaveLength(shifts.length);
    lineItems.forEach((li, i) => {
      // For hourly lines, `unit_rate` is the per-hour rate the user entered
      // on the clinic — NOT the precomputed `rate_applied` (rate × hours).
      expect(li.unit_rate).toBe(shifts[i].hourly_rate);
      expect(li.unit_rate).toBe(160);
      expect(li.qty).toBe(10);
      expect(li.line_total).toBe(160 * 10);
      expect(li.line_kind).toBe('regular');
    });
  });

  it('mixed flat + hourly shifts each carry their own clinic rate to the invoice', () => {
    const reloaded = termsToRates({
      ...ratesToTermsFields([
        { type: 'weekday', label: 'Weekday Rate', amount: 900, kind: 'flat' },
        { type: 'custom', label: 'After-hours', amount: 175, kind: 'hourly' },
      ]),
    });
    const options = buildBulkRateOptions({ rateEntries: reloaded, defaultRates: [] });
    const flat = options.find(o => o.basis === 'daily')!;
    const hourly = options.find(o => o.basis === 'hourly')!;

    const shifts = [
      shiftFromBulkPick({ id: 'm-flat', facility_id: facility.id, date: '2026-07-10', selectedRate: flat, hoursPerShift: 10 }),
      shiftFromBulkPick({ id: 'm-hour', facility_id: facility.id, date: '2026-07-11', selectedRate: hourly, hoursPerShift: 8 }),
    ];

    const { lineItems, invoice } = buildAutoInvoiceDraft(
      facility,
      shifts as unknown as Parameters<typeof buildAutoInvoiceDraft>[1],
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-07-31T23:59:59Z'),
      'INV-003',
    );

    const flatLine = lineItems.find(l => l.shift_id === 'm-flat')!;
    const hourLine = lineItems.find(l => l.shift_id === 'm-hour')!;

    // Flat line: unit_rate = rate_applied = the clinic's day rate.
    expect(flatLine.unit_rate).toBe(900);
    expect(flatLine.line_total).toBe(900);

    // Hourly line: unit_rate = the clinic's hourly rate (NOT rate_applied).
    expect(hourLine.unit_rate).toBe(175);
    expect(hourLine.qty).toBe(8);
    expect(hourLine.line_total).toBe(175 * 8);

    expect(invoice.total_amount).toBe(900 + 175 * 8);
  });
});
