// End-to-end behavioral tests for the AddClinicStepper "Rates" step and the
// downstream effect on ShiftFormDialog.rateOptions.
//
// These tests don't render the stepper React tree (which depends on Google
// Places, DataContext, etc.). Instead they faithfully simulate the save flow
// in `AddClinicStepper.handleSave` + `next()` against in-memory fakes for
// `addFacility`, `updateTerms`, and `updateProfile`. The flow under test is:
//
//   • Direct clinic   + rates entered → terms saved, Rate Card seeded if empty
//   • Direct clinic   + no rates      → first Save bounces (acknowledged=false),
//                                       second Save proceeds with no terms
//   • Non-direct      + rates entered → terms STILL saved (fix #1), Rate Card
//                                       seeded if empty
//   • Non-direct      + no rates      → no bounce, no terms, no seeding
//   • Rate Card seed  is non-destructive: skipped when profile already has rates
//   • Rate Card seed  failure is non-fatal: clinic still saves
//   • Net effect: ShiftFormDialog's rateOptions are non-empty after each
//                 successful save where rates were entered.
import { describe, it, expect } from 'vitest';
import {
  buildDefaultRatesFromRateEntries,
  inferBillingPreference,
  mapDefaultRatesToRateEntries,
  type DefaultRate,
} from '@/lib/onboardingRateMapping';
import {
  ratesToTermsFields,
  termsToRates,
  type RateEntry,
} from '@/components/facilities/RatesEditor';

// ─── Fakes ──────────────────────────────────────────────────────────────

interface FakeFacility {
  id: string;
  name: string;
  engagement_type: 'direct' | 'third_party' | 'platform';
}

interface FakeTermsRow {
  id: string;
  facility_id: string;
  weekday_rate: number;
  weekend_rate: number;
  partial_day_rate: number;
  holiday_rate: number;
  telemedicine_rate: number;
  custom_rates?: any[];
  rate_kinds?: any;
  rate_shift_types?: any;
}

interface FakeProfile {
  default_rates: DefaultRate[];
  default_billing_preference?: string;
}

function createStore(initialProfile: FakeProfile = { default_rates: [] }) {
  const facilities: FakeFacility[] = [];
  const terms: FakeTermsRow[] = [];
  let profile: FakeProfile = { ...initialProfile };
  let updateProfileShouldThrow = false;

  return {
    get facilities() { return facilities; },
    get terms() { return terms; },
    get profile() { return profile; },
    setUpdateProfileShouldThrow(v: boolean) { updateProfileShouldThrow = v; },
    addFacility: async (f: Omit<FakeFacility, 'id'>): Promise<FakeFacility> => {
      const row = { ...f, id: `fac-${facilities.length + 1}` };
      facilities.push(row);
      return row;
    },
    updateTerms: async (t: Omit<FakeTermsRow, never>): Promise<void> => {
      const i = terms.findIndex(x => x.facility_id === t.facility_id);
      if (i >= 0) terms[i] = { ...terms[i], ...t };
      else terms.push({ ...t });
    },
    updateProfile: async (patch: Partial<FakeProfile>): Promise<void> => {
      if (updateProfileShouldThrow) throw new Error('seed failed');
      profile = { ...profile, ...patch };
    },
  };
}

// ─── Mirrors AddClinicStepper.handleSave + the rates-prompt branch in next()
// for the LAST step. Returns whether the save actually committed and
// whether a "soft-required rates" prompt was raised this call.

interface SaveArgs {
  name: string;
  engagementType: 'direct' | 'third_party' | 'platform';
  rates: RateEntry[];
  acknowledgedNoRates: boolean;
}

interface SaveResult {
  committed: boolean;
  promptedRatesStep: boolean;
}

async function runSaveStep(
  store: ReturnType<typeof createStore>,
  args: SaveArgs,
): Promise<SaveResult> {
  const isDirect = args.engagementType === 'direct';

  // Soft-required Rates step (direct only).
  if (isDirect && args.rates.length === 0 && !args.acknowledgedNoRates) {
    return { committed: false, promptedRatesStep: true };
  }

  // Persist the facility.
  const facility = await store.addFacility({
    name: args.name,
    engagement_type: args.engagementType,
  });

  // Persist terms for ANY engagement type when rates were entered (fix #1:
  // rates used to be silently dropped for non-direct clinics).
  if (args.rates.length > 0) {
    const fields = ratesToTermsFields(args.rates);
    await store.updateTerms({
      id: `terms-${facility.id}`,
      facility_id: facility.id,
      ...fields,
    });
  }

  // Seed default Rate Card on first clinic only (fix #2).
  if (args.rates.length > 0 && (store.profile.default_rates?.length ?? 0) === 0) {
    try {
      await store.updateProfile({
        default_rates: buildDefaultRatesFromRateEntries(args.rates),
        default_billing_preference: inferBillingPreference(args.rates),
      });
    } catch {
      // Non-fatal: clinic + terms already saved.
    }
  }

  return { committed: true, promptedRatesStep: false };
}

// ─── Mirrors ShiftFormDialog.buildRateOptions ────────────────────────────
function buildRateOptionsForShiftForm(
  termsRows: FakeTermsRow[],
  facilityId: string,
  defaultRates: DefaultRate[],
) {
  const facilityTerms = termsRows.find(t => t.facility_id === facilityId);
  const fromFacility = facilityTerms
    ? termsToRates(facilityTerms as any).filter(r => r.amount > 0)
    : [];
  const fromCard = mapDefaultRatesToRateEntries(defaultRates);
  const seen = new Set(
    fromFacility.map(r => `${r.kind}:${(r.label || '').trim().toLowerCase()}:${r.amount}`),
  );
  const card: typeof fromCard = [];
  for (const r of fromCard) {
    const k = `${r.kind}:${(r.label || '').trim().toLowerCase()}:${r.amount}`;
    if (seen.has(k)) continue;
    seen.add(k);
    card.push(r);
  }
  return [...fromFacility, ...card];
}

// ─── Fixtures ────────────────────────────────────────────────────────────
const WEEKDAY_RATE: RateEntry = {
  type: 'weekday', label: 'Weekday Rate', amount: 850, kind: 'flat', shift_type: 'gp',
};
const WEEKEND_RATE: RateEntry = {
  type: 'weekend', label: 'Weekend Rate', amount: 1000, kind: 'flat', shift_type: 'gp',
};
const ER_HOURLY: RateEntry = {
  type: 'custom', label: 'ER Hourly', amount: 145, kind: 'hourly', shift_type: 'er',
};

// ─── Tests ───────────────────────────────────────────────────────────────

describe('AddClinicStepper · Rates-step prompt and Rate Card seeding', () => {
  describe('Direct clinic', () => {
    it('saves rates AND seeds Rate Card when user enters rates (first clinic)', async () => {
      const store = createStore({ default_rates: [] });
      const result = await runSaveStep(store, {
        name: 'Valley Animal Hospital',
        engagementType: 'direct',
        rates: [WEEKDAY_RATE, WEEKEND_RATE],
        acknowledgedNoRates: false,
      });

      expect(result.committed).toBe(true);
      expect(result.promptedRatesStep).toBe(false);
      expect(store.facilities).toHaveLength(1);
      expect(store.terms).toHaveLength(1);
      expect(store.terms[0].weekday_rate).toBe(850);
      expect(store.terms[0].weekend_rate).toBe(1000);
      // Rate Card seeded.
      expect(store.profile.default_rates.length).toBeGreaterThan(0);
      expect(store.profile.default_billing_preference).toBeDefined();
    });

    it('bounces back to Rates step on first Save with no rates, then commits on second Save', async () => {
      const store = createStore({ default_rates: [] });

      // First save click — no rates yet, not acknowledged → prompted.
      const r1 = await runSaveStep(store, {
        name: 'Pine Vet',
        engagementType: 'direct',
        rates: [],
        acknowledgedNoRates: false,
      });
      expect(r1.committed).toBe(false);
      expect(r1.promptedRatesStep).toBe(true);
      expect(store.facilities).toHaveLength(0);
      expect(store.terms).toHaveLength(0);

      // Second save click — still no rates but user acknowledged → commits.
      const r2 = await runSaveStep(store, {
        name: 'Pine Vet',
        engagementType: 'direct',
        rates: [],
        acknowledgedNoRates: true,
      });
      expect(r2.committed).toBe(true);
      expect(r2.promptedRatesStep).toBe(false);
      expect(store.facilities).toHaveLength(1);
      // No terms because no rates were entered.
      expect(store.terms).toHaveLength(0);
      // Rate Card NOT seeded because no rates exist.
      expect(store.profile.default_rates).toEqual([]);
    });
  });

  describe('Non-direct clinic (agency / platform)', () => {
    it('saves rates for third_party engagement (fix #1: rates no longer silently dropped)', async () => {
      const store = createStore({ default_rates: [] });
      const result = await runSaveStep(store, {
        name: 'Relief Pro Network',
        engagementType: 'third_party',
        rates: [ER_HOURLY],
        acknowledgedNoRates: false,
      });

      expect(result.committed).toBe(true);
      expect(result.promptedRatesStep).toBe(false);
      expect(store.terms).toHaveLength(1);
      expect(store.terms[0].custom_rates).toEqual([
        { label: 'ER Hourly', amount: 145, kind: 'hourly', shift_type: 'er' },
      ]);
      // Rate Card also seeded.
      expect(store.profile.default_rates.length).toBeGreaterThan(0);
    });

    it('does NOT bounce on empty rates for non-direct (prompt is direct-only)', async () => {
      const store = createStore({ default_rates: [] });
      const result = await runSaveStep(store, {
        name: 'Agency Co',
        engagementType: 'third_party',
        rates: [],
        acknowledgedNoRates: false,
      });

      expect(result.committed).toBe(true);
      expect(result.promptedRatesStep).toBe(false);
      expect(store.terms).toHaveLength(0);
      expect(store.profile.default_rates).toEqual([]);
    });
  });

  describe('Rate Card seeding (fix #2)', () => {
    it('does NOT overwrite an existing Rate Card on a later clinic save', async () => {
      const existingCard: DefaultRate[] = [
        { id: 'r1', basis: 'daily', label: 'Old GP', amount: 800, shift_type: 'gp', sort_order: 0 } as any,
      ];
      const store = createStore({
        default_rates: existingCard,
        default_billing_preference: 'per_day',
      });

      await runSaveStep(store, {
        name: 'Second Clinic',
        engagementType: 'direct',
        rates: [WEEKDAY_RATE], // $850 — different from existing $800
        acknowledgedNoRates: false,
      });

      expect(store.terms).toHaveLength(1);
      // Rate Card untouched.
      expect(store.profile.default_rates).toBe(existingCard);
      expect(store.profile.default_rates).toHaveLength(1);
      expect(store.profile.default_rates[0].amount).toBe(800);
    });

    it('is non-fatal when updateProfile throws: clinic + terms still saved', async () => {
      const store = createStore({ default_rates: [] });
      store.setUpdateProfileShouldThrow(true);

      const result = await runSaveStep(store, {
        name: 'Resilient Vet',
        engagementType: 'direct',
        rates: [WEEKDAY_RATE],
        acknowledgedNoRates: false,
      });

      expect(result.committed).toBe(true);
      expect(store.facilities).toHaveLength(1);
      expect(store.terms).toHaveLength(1);
      // Rate Card seeding failed silently.
      expect(store.profile.default_rates).toEqual([]);
    });
  });

  describe('Downstream effect on ShiftFormDialog.rateOptions', () => {
    it('direct clinic with rates → rateOptions is non-empty from facility terms', async () => {
      const store = createStore({ default_rates: [] });
      await runSaveStep(store, {
        name: 'Direct Clinic',
        engagementType: 'direct',
        rates: [WEEKDAY_RATE, WEEKEND_RATE],
        acknowledgedNoRates: false,
      });
      const facId = store.facilities[0].id;
      const opts = buildRateOptionsForShiftForm(store.terms, facId, store.profile.default_rates);
      // Both rates available; no "Add a rate to finalize" fallback needed.
      expect(opts.length).toBeGreaterThanOrEqual(2);
      const amounts = opts.map(o => o.amount).sort((a, b) => a - b);
      expect(amounts).toContain(850);
      expect(amounts).toContain(1000);
    });

    it('non-direct clinic with rates → rateOptions populated from BOTH facility terms and seeded Rate Card', async () => {
      const store = createStore({ default_rates: [] });
      await runSaveStep(store, {
        name: 'Agency Clinic',
        engagementType: 'third_party',
        rates: [ER_HOURLY],
        acknowledgedNoRates: false,
      });
      const facId = store.facilities[0].id;
      const opts = buildRateOptionsForShiftForm(store.terms, facId, store.profile.default_rates);
      // ER Hourly comes from facility terms; Rate Card mirror is deduped.
      expect(opts.length).toBeGreaterThanOrEqual(1);
      expect(opts.some(o => o.amount === 145 && o.kind === 'hourly')).toBe(true);
    });

    it('direct clinic saved with NO rates (acknowledged) → rateOptions still empty (intentional)', async () => {
      const store = createStore({ default_rates: [] });
      await runSaveStep(store, {
        name: 'No-Rates Clinic',
        engagementType: 'direct',
        rates: [],
        acknowledgedNoRates: true,
      });
      const facId = store.facilities[0].id;
      const opts = buildRateOptionsForShiftForm(store.terms, facId, store.profile.default_rates);
      // User deferred — this is the only scenario where the shift form will
      // legitimately ask for a custom rate.
      expect(opts).toEqual([]);
    });

    it('later non-direct clinic with no rates → previously seeded Rate Card still surfaces rateOptions', async () => {
      const store = createStore({ default_rates: [] });
      // First clinic seeds the Rate Card.
      await runSaveStep(store, {
        name: 'First Direct',
        engagementType: 'direct',
        rates: [WEEKDAY_RATE],
        acknowledgedNoRates: false,
      });
      // Second clinic is agency with no rates entered.
      await runSaveStep(store, {
        name: 'Second Agency',
        engagementType: 'third_party',
        rates: [],
        acknowledgedNoRates: false,
      });

      const agencyId = store.facilities[1].id;
      const opts = buildRateOptionsForShiftForm(store.terms, agencyId, store.profile.default_rates);
      // The Rate Card seeded from the first clinic carries the $850 rate
      // across to the agency clinic — user is NOT asked to "add a rate".
      expect(opts.length).toBeGreaterThan(0);
      expect(opts.some(o => o.amount === 850)).toBe(true);
    });
  });
});
