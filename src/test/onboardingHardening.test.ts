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
