

## New guided onboarding: Clinic → Shifts → Live Invoice → Financial Health → Dashboard

### Goal

Replace the current 3-step onboarding (Clinic → Shift → Tax) with a 4-step guided flow that builds momentum through real "aha moments": *"I just added a clinic → my shifts are tracked → an invoice appeared → my dashboard came alive."*

### The new flow

```text
Step 1 ─ Add a clinic              (required: ≥1)
Step 2 ─ Log shifts at this clinic (required: ≥1, encouraged: more)
Step 3 ─ Live Invoice Preview      (aha moment #1)
Step 4 ─ Financial Health Preview  (aha moment #2)
        ─→ Dashboard
```

The Tax step is **removed from onboarding** (kept available in Tax Center). Reason: it interrupts the momentum between "I see my invoice" and "I see my dashboard." Users can set tax profile later; the Settings nudge covers it.

---

### Step 1 — Add a clinic *(unchanged behavior, lighter copy)*

Reuse existing `AddClinicStepper` inline form. Once one clinic is saved, surface the saved clinic card (existing) and a sticky CTA: **"Continue → Log shifts at [Clinic Name]"**. Allow "Add another clinic" but de-emphasize — most users add one and move on.

**Aha framing copy under heading:**
> "We'll keep all your rates, billing terms, and contacts in one place — so the second time you work here, everything's ready."

---

### Step 2 — Log shifts (new: multi-shift, encouraged)

Replace the single-shift form with a **shift list builder** for the just-added clinic:

```text
┌─────────────────────────────────────────────────┐
│ Log shifts at Valley Animal Hospital            │
│                                                 │
│ Add every shift you've worked here recently —   │
│ each one becomes a billable line on your        │
│ invoice. Most relief vets log 3–5 to start.     │
│                                                 │
│ ┌─ Shift 1 ──────────────────────────────────┐ │
│ │ Apr 18 · 8:00 AM – 6:00 PM · $850       ✓ │ │
│ └────────────────────────────────────────────┘ │
│ ┌─ Shift 2 ──────────────────────────────────┐ │
│ │ Apr 22 · 8:00 AM – 6:00 PM · $850       ✓ │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ + Add another shift                            │
│                                                 │
│ Running total:  2 shifts · $1,700              │
└─────────────────────────────────────────────────┘
```

**Mechanics:**
- Inline "Add shift" form with date / start / end / rate (rate prefilled from clinic terms).
- On save, the shift collapses into a compact row above the form, and the form resets to the next chronological date (yesterday → day before → etc.) so users can rapid-fire add a week.
- Live **Running total** chip animates upward with each addition (the small dopamine hit).
- Sticky CTA: **"See my invoice (N shifts logged)"** — enabled after 1 shift, label updates with count.
- Secondary link: *"I'll log the rest later"*.

**Aha framing:** the running total visibly grows with each shift — users feel the platform doing the math they've been doing in spreadsheets.

---

### Step 3 — Live Invoice Preview *(new — aha moment #1)*

Full-screen "look what we made for you" reveal. Shows the **actual draft invoice** auto-generated from the shifts logged in Step 2 (already happens via `DataContext` auto-generation logic — we just surface it).

```text
┌─────────────────────────────────────────────────┐
│ ⚡ Your first invoice is ready                  │
│                                                 │
│ ┌────────────────────────────────────────────┐ │
│ │           INVOICE  VAH-001                 │ │
│ │           Bill to: Valley Animal Hospital  │ │
│ │                                            │ │
│ │  Apr 18 · Relief services · 10h    $850   │ │
│ │  Apr 22 · Relief services · 10h    $850   │ │
│ │  Apr 24 · Relief services · 10h    $850   │ │
│ │                                            │ │
│ │  ──────────────────────────────────────    │ │
│ │  Total due                       $2,550   │ │
│ │  Due Apr 30, 2026 · Net 15                │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ ✨ How this works going forward                │
│ Every shift you log adds a line to the open    │
│ invoice for that clinic — no spreadsheet, no   │
│ end-of-month scramble. We'll draft, you review │
│ and send.                                      │
│                                                 │
│ [Continue → See your dashboard]                │
└─────────────────────────────────────────────────┘
```

**Mechanics:**
- Pull the just-created draft invoice + line items from `useData()` (filter by `facility_id` of clinics added during this session, status `draft`).
- Use existing `InvoicePreview` component (or a stripped variant) for visual fidelity — it's the same invoice they'll see post-onboarding.
- Static educational block beneath: 3 short bullets — *"You log shifts → we draft invoices → you review & send → we track payment."*
- No edits here; Step 3 is a reveal, not a form. Keeps the moment clean.

---

### Step 4 — Financial Health Preview *(new — aha moment #2)*

Show a real, populated mini Business Hub using the shifts just logged.

```text
┌─────────────────────────────────────────────────┐
│ 📊 Your Financial Health is live                │
│                                                 │
│ ┌─ This month ──────────────────────────────┐  │
│ │  Earned (logged shifts)         $2,550    │  │
│ │  Outstanding (drafts)           $2,550    │  │
│ │  Collected                          $0    │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌─ Income by clinic ────────────────────────┐  │
│ │  Valley Animal Hospital  ████████  $2,550 │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌─ At a glance ─────────────────────────────┐  │
│ │  3 shifts · 30 hours · avg $850/shift     │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ Every shift and every paid invoice will keep   │
│ this updated automatically. The more you log,  │
│ the sharper the picture.                       │
│                                                 │
│ [Take me to my Dashboard →]                    │
└─────────────────────────────────────────────────┘
```

**Mechanics:**
- Pure read-only summary computed from local `shifts`, `invoices`, `lineItems` for the user's freshly-added data.
- Three compact cards: *This month totals*, *Income by clinic* (single bar for the one clinic, but visually shows the framework), *At a glance* counters.
- Final CTA calls `completeOnboarding()` then `navigate('/')`.

---

### Files

**New:**
- `src/components/onboarding/OnboardingShiftBuilder.tsx` — Step 2 multi-shift builder (replaces single-shift `OnboardingShiftStep` for onboarding use).
- `src/components/onboarding/OnboardingInvoiceReveal.tsx` — Step 3 live invoice preview.
- `src/components/onboarding/OnboardingFinancialReveal.tsx` — Step 4 financial health preview.

**Modified:**
- `src/pages/OnboardingPage.tsx` — Replace `Phase` enum with `'add_clinic' | 'log_shifts' | 'invoice_reveal' | 'financial_reveal'`. Update `PHASE_STEP`, `PHASE_LABEL`, `PHASE_BACK`, `TOTAL_STEPS = 4`. Wire new components. Remove `OnboardingTaxStep` and `WorkspaceReady` usage from this flow. Drop `taxEnabled` state.

**Untouched:**
- `AddClinicStepper`, `OnboardingClinicForm` — already solid.
- `OnboardingTaxStep`, `WorkspaceReady` — kept in repo (still referenced elsewhere / available for re-use), just not wired into onboarding.
- `DataContext` invoice auto-generation — already creates the draft invoice we display in Step 3.
- Tax Center, Settings, Dashboard — no changes.

### Verification

- New user signs up → lands on Step 1 (Add clinic).
- Saves a clinic → sticky CTA flips to "Continue → Log shifts at [Clinic]".
- Logs 1 shift → "See my invoice (1 shift logged)" enables. Logs 3 → label updates to "(3 shifts logged)" and running total reads `$2,550`.
- Step 3 shows the actual draft invoice with all 3 line items, totals, and due date.
- Step 4 shows month earnings = `$2,550`, outstanding = `$2,550`, single-clinic income bar.
- "Take me to my Dashboard" → marks onboarding complete, lands on `/`.
- Back button on each step returns to the prior step with state preserved.

