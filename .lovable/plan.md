

## Phase 1: Activation-driven onboarding (Rate Card → Clinic → Bulk Shifts → Invoice stub)

### Flow

```text
Step 1  Rate Card               "Set how you get paid" (NEW)
Step 2  Add Clinic              Slim version of existing stepper, rates hidden
Step 3  Bulk Shift Calendar     Aha #1 — multi-date select + one time + one rate (NEW)
Step 4  Invoice Reveal (stub)   Transition screen — full reveal lands in Phase 2
```

Existing post-shift screens (`OnboardingInvoiceReveal`, `OnboardingFinancialReveal`) are removed from the flow but **not deleted yet** — they remain in the repo so Phase 2 can rebuild on them.

---

### Step 1 — Rate Card (NEW)

**File:** `src/components/onboarding/OnboardingRateCard.tsx`

- Headline: *"Let's set up how you get paid"*  
  Sub: *"Choose your usual billing style and create reusable default rates. You can always customize rates for each clinic later."*
- **Billing preference** — 4 selection cards in a 2×2 grid (single select):
  - Per Day · Per Hour · Both · I'm not sure yet
- On selection, populate suggested rate rows using the user's choice. Defaults seeded with sensible US relief-vet numbers (editable):

| Per Day | $ |
|---|---|
| Standard Day | 850 |
| Weekend Day | 950 |
| Holiday Day | 1100 |
| Emergency / On-call | 1200 |

| Per Hour | $ |
|---|---|
| Standard Hour | 110 |
| Weekend Hour | 130 |
| Holiday Hour | 160 |
| After-hours | 145 |

- **Both** shows two stacked sections with subtle headers ("Daily rates" / "Hourly rates"). **I'm not sure yet** loads the daily set.
- Each rate row: editable `name`, editable `amount` (with `$` adornment), trash icon. "+ Add custom rate" appends a blank row at the end of the section it belongs to.
- Footer helper: *"You can always override or add clinic-specific rates later."*
- Sticky CTA: **Continue**

**Data shape persisted to `user_profiles`:**

```ts
type DefaultRate = {
  id: string;          // crypto.randomUUID()
  name: string;
  amount: number;      // dollars
  basis: 'daily' | 'hourly';
  active: boolean;     // default true
  sort_order: number;
};

default_rates: DefaultRate[]
default_billing_preference: 'per_day' | 'per_hour' | 'both' | 'unsure'
```

---

### Step 2 — Add Clinic (slim)

**Reuses** `AddClinicStepper` with two new props (non-breaking; defaults preserve existing behavior elsewhere):

- `hideRatesStep?: boolean` — when `true`, skips the Rates step entirely.
- `defaultRates?: RateEntry[]` — pre-fills the stepper's internal `rates` state so the saved facility's `terms_snapshot` carries the user's rate card forward via the existing `updateTerms` call.

**Mapping** Rate Card → `RateEntry[]`:
- Daily rates from card → entries with `kind: 'flat'`. The first daily rate becomes `weekday_rate`; the rest land in `custom_rates` (preserving `name` as label).
- Hourly rates → entries with `kind: 'hourly'`, all into `custom_rates`.
- A small mapper `mapDefaultRatesToRateEntries(defaultRates)` lives in a new `src/lib/onboardingRateMapping.ts`.

**Onboarding context only** uses `hideRatesStep`. All other call sites remain untouched.

---

### Step 3 — Bulk Shift Calendar (NEW)

**File:** `src/components/onboarding/OnboardingBulkShiftCalendar.tsx`

Layout (single column, `max-w-[680px]`):

```text
┌──────────────────────────────────────────────────┐
│  ✨ You can add multiple shifts in one go        │ ← bold callout in primary tint card
├──────────────────────────────────────────────────┤
│  Pick the dates you'll work at [Greenfield Vet] │
│                                                  │
│  ◀  April 2026  ▶                                │
│  [ react-day-picker, mode="multiple" ]          │
│                                                  │
│  Selected: 0 dates                              │
├──────────────────────────────────────────────────┤
│  Start time [  08:00  ]  End time [  18:00  ]   │
│  Rate       [  Standard Day — $850  ▼  ]        │
│                                                  │
│  Projected gross:  $0                           │
└──────────────────────────────────────────────────┘
Sticky footer:  [ Add 0 shifts ]   (disabled until ≥1 date)
```

**Behavior:**
- `Calendar` from `@/components/ui/calendar` with `mode="multiple"`, `selected={dates}`, `onSelect={setDates}`. **No date pre-selected.** `pointer-events-auto` per shadcn datepicker rule.
- Time inputs: `<Input type="time" />` for start/end (defaults `08:00` / `18:00`). Validation: end must be after start.
- Rate selector: pulled from the saved facility's `terms_snapshot` (which came from the rate card). Options list daily then hourly, labeled with name + amount + `/day` or `/hr`.
- Projected gross = `dates.length × rate.amount` for daily, or `dates.length × hours × rate.amount` for hourly. Updates live.
- **CTA label is dynamic:** `Add {n} shift{n!==1?'s':''}` (singular when n=1). Disabled when n=0.
- On submit, loop `addShift(...)` once per selected date (existing DataContext path; auto-generates draft invoices via existing logic). Track returned shift IDs in `sessionShiftIds` for downstream phases.
- After creation, the screen transitions to a success state in place:
  - Replace the Add CTA area with: *"✓ N shifts saved · Projected $X,XXX"*
  - Body copy: *"Your shifts are saved. Next, see how Locum Ops prepares invoices for you."*
  - New sticky CTA: **See my invoices →** (advances to invoice reveal stub)
- Calendar still visible (read-only highlight of created dates) — user can review what they added.

---

### Step 4 — Invoice Reveal Placeholder (stub)

**File:** `src/components/onboarding/OnboardingInvoiceRevealStub.tsx`

A calm transition screen (no fake data, no fabricated previews):

- Heading: *"We're preparing your first invoice previews"*
- Sub: *"Locum Ops auto-drafts invoices from your shifts. Coming up next, you'll see how this works."*
- Small data summary card grounded in real session state: `1 clinic · N shifts · $X,XXX projected`.
- Sticky CTA: **Take me to my dashboard →** → calls `completeOnboarding()` and navigates to `/`.

This screen is intentionally minimal. Phase 2 replaces it with the real multi-draft `InvoicePreview` reveal.

---

### State machine — `OnboardingPage.tsx`

Replace existing `Phase` union and helpers:

```ts
type Phase = 'rate_card' | 'add_clinic' | 'bulk_shifts' | 'invoice_reveal_placeholder';

const PHASE_STEP: Record<Phase, number> = {
  rate_card: 1, add_clinic: 2, bulk_shifts: 3, invoice_reveal_placeholder: 4,
};
const TOTAL_STEPS = 4;
const PHASE_LABEL = {
  rate_card: 'Set up your rates',
  add_clinic: 'Add your first clinic',
  bulk_shifts: 'Add your shifts',
  invoice_reveal_placeholder: 'See your invoices',
};
const PHASE_BACK: Record<Phase, Phase | null> = {
  rate_card: null,
  add_clinic: 'rate_card',
  bulk_shifts: 'add_clinic',
  invoice_reveal_placeholder: 'bulk_shifts',
};
```

**State preserved across back-nav** (kept in `OnboardingPage` component state for the session):
- `defaultRates`, `defaultBillingPreference` (also persisted via `updateProfile` on Continue).
- `firstFacilityId`, `firstFacilityName` (set when clinic saves; if user goes back to Step 2, the form is re-mounted but the saved facility row stays in DB — the stepper's existing edit-mode is **not** wired in, so we'll show a small "Already added: [facility name] — [Edit] [Replace]" banner above the stepper if `firstFacilityId` exists; clicking Edit skips the form and proceeds, Replace clears state and shows blank form). Lightweight; no schema changes.
- `sessionShiftIds: string[]` (created in Step 3).
- `bulkDraft` (selected dates + start/end + chosen rate id) so going back from Step 4 to Step 3 keeps the success state visible.

**Footer wiring** per phase:
- `rate_card`: [Continue]
- `add_clinic`: [Back] · stepper handles its own [Save] (we mirror with [Continue] disabled until `firstFacilityId` set, OR rely on stepper's `onSaved` callback to advance automatically)
- `bulk_shifts`: [Back] · [Add N shifts] (pre-create) → swaps to [Back] · [See my invoices →] (post-create)
- `invoice_reveal_placeholder`: [Back] · [Take me to my dashboard →]

---

### Database migration

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS default_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_billing_preference text NOT NULL DEFAULT 'per_day';
```

No RLS changes (existing `user_profiles` policy covers).

`UserProfileContext` updated:
- Add `default_rates: DefaultRate[]` and `default_billing_preference: 'per_day' | 'per_hour' | 'both' | 'unsure'` to `UserProfile`.
- Extend `DEFAULT_PROFILE` with empty `default_rates: []` and `default_billing_preference: 'per_day'`.
- Hydrate from `data.default_rates` / `data.default_billing_preference` in `loadProfile()`.

---

### Files

**New:**
- `src/components/onboarding/OnboardingRateCard.tsx`
- `src/components/onboarding/OnboardingBulkShiftCalendar.tsx`
- `src/components/onboarding/OnboardingInvoiceRevealStub.tsx`
- `src/lib/onboardingRateMapping.ts` (mapper: `DefaultRate[] → RateEntry[]` and helper for the bulk-calendar rate dropdown source)

**Modified:**
- `src/pages/OnboardingPage.tsx` — new phase machine + per-phase render + sticky-footer wiring + session-state preservation
- `src/components/facilities/AddClinicStepper.tsx` — accept `hideRatesStep?: boolean` and `defaultRates?: RateEntry[]`; when both set, pre-populate `rates` state and skip the Rates step in the stepper's internal `steps` array. Adjusts `totalSteps` reported via the imperative handle accordingly. Non-onboarding callers unaffected.
- `src/contexts/UserProfileContext.tsx` — add the two new fields to type, defaults, and load/insert paths
- DB migration (above) — adds `default_rates` and `default_billing_preference` columns

**Untouched (kept for Phase 2):**
- `src/components/onboarding/OnboardingInvoiceReveal.tsx`
- `src/components/onboarding/OnboardingFinancialReveal.tsx`
- `src/components/onboarding/OnboardingShiftBuilder.tsx`
- `src/components/onboarding/OnboardingShiftStep.tsx`
- `src/components/onboarding/OnboardingTaxStep.tsx`
- `OnboardingClinicForm`, `ManualFacilityForm`, etc.

These are no longer referenced from `OnboardingPage` after this phase but remain in the repo so Phase 2 can build on `OnboardingInvoiceReveal` for the real multi-draft reveal.

---

### Assumptions

1. Existing `addFacility` + `updateTerms` pipeline auto-generates draft invoices from shifts (already in place); we don't need new invoice logic in Step 3.
2. `AddClinicStepper`'s current 4-step internal flow (identity → engagement → rates → billing) can have its rates step skipped by filtering the internal steps list when `hideRatesStep` is true; "Continue" button labels and step numbers update accordingly.
3. Suggested daily/hourly amounts above are reasonable defaults — fully editable by user, no business decision implied.
4. We treat the saved facility's `terms_snapshot` as the source for the bulk-calendar's rate dropdown. If for some reason terms didn't save (edge case), we fall back to `profile.default_rates`.
5. Going back from `add_clinic` to `rate_card`: the saved profile rates persist (they were committed on Continue), so re-entering Step 1 shows them prefilled.
6. Going back from `bulk_shifts` to `add_clinic`: the already-saved facility stays — we show the "Already added · Edit / Replace" banner described above rather than re-running Save logic.
7. Demo mode (Sarah Mitchell) continues to skip onboarding entirely (existing `onboarding_completed_at` gate).

---

### Phase 1 verification (must pass end-to-end)

1. New user signs up → lands on `rate_card`.
2. Selects "Per Day" → 4 daily rate rows prefill → edits one amount → adds a custom row → Continue.
3. `add_clinic` shows the existing stepper minus the Rates step. Saves a clinic; the clinic's `terms_snapshot` reflects rates from the rate card.
4. `bulk_shifts` shows a calendar with **no date selected**, "Add 0 shifts" disabled. Selecting 5 dates updates label to "Add 5 shifts" and projected gross. Submitting creates 5 shifts attached to the new clinic.
5. Success state replaces the CTA area; **See my invoices →** advances to the placeholder.
6. Placeholder shows real session counts and "Take me to my dashboard →" calls `completeOnboarding()`.
7. Back navigation from any step ≥2 returns to the prior phase with state intact.

---

### Out of scope (Phase 2+)

- Multi-draft live invoice reveal (replaces stub)
- Loop choice screen (Add another clinic / Add more shifts / Done)
- Locum Ops business map / constellation screen
- Onboarding analytics events
- Animations beyond the existing app's defaults

