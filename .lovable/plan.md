## Goal

Make adding a clinic feel instant: save it with just a name (and optionally an address) in seconds, while keeping a clear, low‑friction path to enrich it later with engagement, rates, break policy, billing, and contacts.

Today the Add Clinic flow is a 5+ step stepper that requires the user to walk through engagement, rates, billing, and break policy before they can save. That's the right depth for a "set up properly" mode, but it's heavy when the user just wants to capture a clinic name they're about to work with.

## Proposed experience

### 1. New "Quick Add" as the default entry point

Replace the current stepper dialog's first surface with a single compact form:

```text
┌─ Add Clinic ─────────────────────────────────┐
│  Clinic name*      [_________________]       │
│  Address (opt.)    [Google Places search]    │
│  Timezone          [Auto-detected ▼]         │
│                                              │
│  [ Save & close ]   [ Save & add details → ] │
└──────────────────────────────────────────────┘
```

- Only `name` is required. Address and timezone are optional with smart defaults (timezone auto-derived from address, falls back to profile tz).
- Two primary actions:
  - **Save & close** — creates the clinic with safe defaults and returns the user to wherever they were.
  - **Save & add details** — creates the clinic immediately, then opens the enrichment flow (so progress is never lost if they bail).

A small "Need engagement type, rates, or billing now? Add details" link sits under the form for users who want to jump straight to the full setup without saving first.

### 2. Enrichment after save — sectioned, not stepped

After "Save & add details" (or when the user opens an existing clinic and clicks "Complete setup"), show a single page with collapsible sections instead of a forced wizard:

```text
Acme Animal Hospital — Complete setup
─────────────────────────────────────────────
▸ How you work together     (engagement type, dates)        [Add]
▸ Rates                     (day/hourly/overtime)           [Add]
▸ Break policy              (paid/unpaid, length)           [Add]
▸ Billing & invoicing       (cadence, net terms)            [Add]
▸ Billing contact           (name, email, phone)            [Add]
▸ On-site contact           (manager, scheduler)            [Add]
▸ Notes / tech access       (free text)                     [Add]

           [ Done — back to clinic ]
```

- Each section opens inline, saves independently, and shows a green check when complete.
- Sections are reorderable in code (not by the user) so the most-used (Rates, Billing) sit on top.
- A subtle progress meter at the top ("3 of 7 sections completed") nudges, but never blocks.

### 3. Defaults applied on quick save

When the user picks **Save & close**, we still create a usable record by applying:

- Engagement: `unspecified` (no terms-snapshot side effects until they fill it in).
- Rates: prefilled from the user's Rate Card if present, otherwise empty.
- Billing cadence: pulled from `profile.default_billing_cadence`, else `monthly` / Net 30.
- Break policy: empty (treated as "not configured" in scheduling).
- Status: `Active`.

These are exactly the defaults the stepper already produces when steps are skipped, so no new business logic is introduced.

### 4. Surfacing the "incomplete" state

- On the Facilities list, a clinic missing rates/billing/engagement gets a soft "Setup incomplete · Add details" chip linking to the enrichment page.
- The post-save toast keeps its existing "Open clinic" action but adds a second action: **"Add rates & billing"** that deep-links to the Rates section of the enrichment page.

### 5. Entry points

The Quick Add dialog replaces the current stepper everywhere it's launched today:
- Facilities page "Add Clinic"
- Sidebar Quick Add menu
- Shift creation "+ Add new clinic" inline
- Onboarding (onboarding keeps its rate-card-driven path; the dialog respects `hideRatesStep` semantics)

## Technical notes

- Reuse `AddClinicStepper`'s save logic by extracting a `createClinicWithDefaults({ name, address, timezone })` helper from its existing submit path so Quick Add and the full flow share one write code path.
- Build a new `<ClinicSetupSections />` component that wraps the existing sub-editors already used by the stepper (`RatesEditor`, `BreakPolicySelector`, `EngagementSelector`, billing fields, contacts) — each rendered inside an accordion section that saves on its own.
- New route segment: `/facilities/:id/setup` for the enrichment page; reachable from the toast, the Facilities list chip, and a "Complete setup" button on the clinic detail header.
- Keep the existing stepper component but stop mounting it from `AddFacilityDialog`; the stepper becomes the implementation behind `ClinicSetupSections` (sections reuse its field-level components, not its step machine).
- Telemetry: keep current `trackOnboarding` events for parity, plus add `clinic_quick_add_saved` and `clinic_setup_section_completed` so we can see how often users return to finish details.

## Out of scope for this plan

- Bulk import of clinics.
- AI-assisted prefill from a clinic website.
- Restructuring the clinic detail page itself (only adds a "Complete setup" CTA).
