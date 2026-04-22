

## Improve the Add Clinic & Add Shift Flows

### Goal
Right now the Add Clinic flow shows every section at once (clinic details → engagement → rates → contacts → billing) with minimal "why am I doing this" context. The Add Shift flow has a similar issue — fields appear without explaining what they're for or how they affect downstream work (invoices, taxes, OT).

This proposal:
1. **Restructures Add Clinic into a guided 4-step flow** with one focused decision per step and a clear "what this does for you" explainer at the top of each.
2. **Creates a parallel guided Add Shift flow** with explicit context about how each input drives invoices, the tax estimate, and overtime.
3. **Adds smart defaults and inline previews** so the user always sees the impact of their choices before saving.

---

### Part A — Add Clinic Flow (4 guided steps)

Replace the current single-page `OnboardingClinicForm` and the legacy multi-step `AddFacilityDialog` with one shared **stepper component** used in both onboarding and the standalone "Add Practice Facility" dialog. Each step has a header (title + 1-line subtitle), a "**Why we ask**" callout, the inputs, and a sticky footer with `Back / Skip / Next`.

**Step 1 — Clinic Identity**
- Inputs: Google Places search (or manual), clinic name, address.
- Why we ask: *"This is how the clinic appears across your schedule, invoices, and reports."*
- Smart default: timezone auto-detected from address.

**Step 2 — How You Work With Them** (engagement)
- Inputs: `EngagementSelector` (Direct / Third-party platform / W-2 employer), source name, 1099 vs W-2 form.
- Why we ask: *"Direct clinics get auto-generated invoices from LocumOps. Platform/agency work skips invoicing because the platform pays you."*
- Inline preview (small card): *"You'll be billing this clinic directly. We'll generate draft invoices for you."* OR *"VetTriage handles your invoicing — we'll just track shifts and income for taxes."*
- Branch: if W-2 or third-party, **steps 3 and 4 are skipped** (already the behavior — but now we surface that with: *"Skipping billing setup — your platform handles this."*).

**Step 3 — Your Rates** (the new "What rates do you want to add?" step)
- Inputs: `RatesEditor` with prefilled empty Weekday rate row.
- Why we ask: *"Rates you save become defaults when you log a shift here, so you're not re-entering numbers every time. Add as many as apply (Weekday, Weekend, Holiday, etc.)."*
- New helper card: *"Tip — most relief vets start with one Weekday day rate (e.g. $850 flat). You can add Weekend, Holiday, or hourly rates later."*
- Optional callout for hourly rates with OT: *"Hourly rates can include an overtime threshold (e.g. 1.5× after 8 hrs/day)."*
- **Skip allowed.** If skipped, shifts at this clinic prompt the user to enter a rate inline.

**Step 4 — Billing & Contacts** (the new "How often do you want to bill?" step, direct only)
- Section A — **Billing Cadence**: Daily / Weekly / Monthly with a large radio-card layout. Each card shows a one-line example:
  - Daily — *"A draft invoice each morning you have a shift."*
  - Weekly — *"One invoice per week (Mon–Sun), drafted on your last shift."*
  - Monthly — *"One invoice at month-end. Most common for relief work."* ← default, marked "Recommended"
- Section B — **Payment Terms** (Net 7/14/15/30/45/60), default Net 15, with helper: *"Industry standard for relief vet work is Net 15 to Net 30."*
- Section C — **Contacts**: Scheduling contact (used for confirmations) + Billing contact (used for invoices), with the existing "Same as scheduling" checkbox.
- **Live preview at bottom**: a sample invoice header card showing `INV-{prefix}-001 · Bill to: {billing name} · Due: {due date}` so users see exactly what their first invoice will look like.

**Final review screen** (new): one summary card with all 4 sections collapsed, plus an amber CTA: **"Save clinic & log your first shift here →"** which closes the dialog and immediately opens Add Shift pre-filled with this clinic.

---

### Part B — Add Shift Flow (separate guided experience)

The current 3-step Shift Dialog (Facility → Schedule → Details) is solid but lean on context. We'll keep the 3 steps and **add the same "Why we ask" pattern**, plus inline impact previews so the user sees what each entry produces.

**Step 1 — Pick the Clinic**
- Why we ask: *"We'll use this clinic's saved rates, billing cadence, and contacts."*
- Inline chip under the picker showing the clinic's defaults: `Monthly billing · Weekday $850 flat · OT after 8h` so the user knows what's about to be applied.
- "+ Add new clinic" inline link if missing.

**Step 2 — When**
- Why we ask: *"Used for your calendar, mileage tracking, and the billing period this shift falls into."*
- Inputs: date, start, end, color, optional repeat (already exists).
- New: live "**This shift will be billed on**" line under the time inputs (e.g. *"…on the April invoice, generated April 30."*) — pulls from the clinic's billing cadence.

**Step 3 — Pay & Notes**
- Why we ask: *"We'll calculate your total, set aside an estimated tax cushion, and use this on the invoice."*
- Rate selector shows the clinic's saved rates as one-click chips, plus "Custom rate" for a one-off.
- Below the rate, three live-preview chips:
  - **Total**: `$1,045.00`
  - **OT applied**: `2h × $142.50` *(amber, only if OT triggered)*
  - **Tax set-aside**: `~$313` *(uses the existing withholding nudge)*
- Optional: notes, mileage override.
- New "Why hourly shifts ask for start/end" tooltip already done — keep it.

**Final review chip** (existing): keep the green "Shift logged → invoice draft updated" toast, but expand it to a small inline card: *"Added 4/22 at Greenfield. Your April draft invoice is now $4,250 across 5 shifts. View →"*

---

### Part C — Shared improvements

- **One reusable `<GuidedStep>` component** (`src/components/onboarding/GuidedStep.tsx`) wrapping each step's title, subtitle, "Why we ask" callout, and content slot. Used by both flows so the visual rhythm is identical.
- **Calm-colleague tone throughout**: no marketing copy, no "magic AI" language, plain helpful explanations.
- **No new database fields** — pure UX restructure.
- **Skip is always visible** for non-required steps with copy: *"Skip — I'll add this later from the clinic page."*
- All existing data writes (facility creation, terms, confirmation settings, shift creation, OT) stay identical.

---

### Files to change

- **New**: `src/components/onboarding/GuidedStep.tsx` — shared step wrapper.
- **New**: `src/components/facilities/AddClinicStepper.tsx` — the 4-step stepper used by both onboarding and the standalone dialog.
- **Refactor**: `src/components/onboarding/OnboardingClinicForm.tsx` → renders `AddClinicStepper` (no duplicate form code).
- **Refactor**: `src/components/AddFacilityDialog.tsx` → wraps `AddClinicStepper` in a Dialog (replaces the current 5-step welcome/enrichment flow). The old Optional Details (tech, wifi, PIMS, access) becomes a post-creation toast: *"Add tech access info →"* link to facility detail.
- **Edit**: `src/components/schedule/ShiftFormDialog.tsx` — wrap each step's content with `GuidedStep`, add the live "billed on" / total / OT / tax preview chips, add clinic-defaults chip on Step 1.
- **Edit**: `src/pages/OnboardingPage.tsx` — adjust sticky footer copy to match new step labels.

### Out of scope
- Database/schema changes.
- Changes to OT logic, invoice generation, or tax calc — purely presentation.
- Touching the post-onboarding "Log a shift" step in OnboardingPage (already streamlined).

### Open question
For the **Add Clinic dialog opened from the Facilities page** (not onboarding), should the final "Save clinic & log first shift" CTA stay, or just close the dialog and return to the Facilities list? My recommendation: keep it — it's the natural next action and reinforces the clinic→shift→invoice loop.

