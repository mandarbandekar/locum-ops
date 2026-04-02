

# Estimated Tax Copilot — Redesign Plan

## The Problem (Summary)

Users don't want a tax-filing app. They want a simple system that answers: "How much should I save, what should I pay, when, and what deductions matter for my relief practice?" The current implementation splits this across 3 separate tabs (Insights, Tax Tracker, Tax Advisor) with overlapping concepts, heavy UI, and no clear "am I on track?" signal.

## Current State

The Business page has 3 top-level tabs:
- **Insights** (ReportsPage) — revenue charts, facility breakdown, AI summary
- **Estimated Tax Tracker** (TrackerTab) — estimator card, reserve preference, readiness checklist, quarterly status cards
- **Tax Advisor** (TaxPlanningAdvisorPage) — AI chat, entity guidance, opportunity review, CPA questions, CPA prep summary (5 sub-tabs)

Problems:
1. Tax Tracker and Tax Advisor overlap heavily (both have deduction concepts, CPA prep, entity guidance)
2. Tax Tracker is dense — estimator, reserve settings, readiness checklist, and quarterly cards all on one scroll
3. Tax Advisor has 5 sub-tabs, too many for a guidance feature
4. No single "status beacon" that reduces anxiety at a glance
5. Users must understand the structure to find what they need

## Proposed New Structure

Consolidate into **2 top-level tabs** on the Business page:

```text
Business
├── Insights (existing — no changes)
└── Tax Copilot (replaces both "Tax Tracker" and "Tax Advisor")
    ├── Status Banner (am I on track?)
    ├── KPI Strip (YTD income, est. liability, reserve, gap)
    ├── Quarterly Timeline (4 quarter cards, inline)
    ├── Deductions & Write-Offs section
    ├── Guidance & CPA Prep section
    └── Ask Advisor (AI chat, collapsed by default)
```

### Tab 1: Insights (unchanged)
Keep the existing ReportsPage as-is.

### Tab 2: Tax Copilot (new single page replacing 2 tabs)

**Section A — Status Banner + KPI Strip**
A single colored banner at the top answering "Am I on track?":
- Green: "On Track — your reserve covers your estimated liability"
- Amber: "Review Needed — your reserve is under your estimate by $X"  
- Red: "Action Needed — Q[N] payment is past due"

Below it, 4 compact KPI cards (same data as current TrackerTab summary cards, reused):
- YTD Gross Income (auto from paid invoices)
- Est. Tax Liability (from estimator logic)
- Your Reserve (from set-aside calculation)
- Next Due (quarter + date)

**Section B — Tax Estimator (existing component)**
Keep `TaxEstimatorCard` as-is — it already works well. Filing status, deductions input, annual summary, quarterly installments table, reserve comparison. No changes needed to this component.

**Section C — Quarterly Timeline**
Simplify the current quarterly cards. For each quarter show:
- Due date, status badge (not started / reviewed / scheduled / paid)
- Estimated payment amount (from installment calculation)
- One-line notes field
- Collapsible for past quarters (keep existing pattern)

Remove the per-quarter checklist items — move the checklist to a single "Tax Readiness" section instead of duplicating per quarter.

**Section D — Reserve Preference**
Keep the existing reserve mode selector (% of income vs fixed monthly). Compact, same logic.

**Section E — Deductions & Write-Offs**
Pull in `DeductionsTab` content inline (currently lives on TaxStrategyPage but isn't shown). Show:
- Category list with YTD amounts
- Documentation status per category
- Relief-specific defaults (mileage, CE, licensing, phone/software, home office, supplies, insurance)
- Add/edit capability

**Section F — Guidance & CPA Prep (collapsible sections)**
Merge the best parts of the Tax Advisor sub-tabs:

1. **Entity Guidance** — keep the existing `GuidanceTab` "Worth discussing with CPA?" form + entity basics. Revenue-aware: if YTD income > $80K, surface a hint about S-Corp discussion.

2. **Tax Readiness Checklist** — the existing 12-item checklist, shown once (not per-quarter). Progress bar. Toggle complete/ignore.

3. **CPA Prep Summary** — one-click generate + copy. Pulls from: income data, deduction categories, quarterly statuses, and saved CPA questions. Keep existing `CPAPrepSummaryTab` logic.

4. **My CPA Questions** — simple list of saved questions with add/remove/toggle include-in-summary. Keep existing logic.

**Section G — Ask Advisor (collapsible)**
Keep the AI chat from `AskAdvisorTab` but make it a collapsible section at the bottom rather than a primary tab. Users can expand it when they have a question. Past sessions list included.

## What Gets Removed / Simplified

- **Tax Advisor as a separate top-level tab** — merged into Tax Copilot
- **Opportunity Review sub-tab** — its categories become the Deductions section above (overlap is ~80%)
- **5 sub-tabs inside Tax Advisor** — flattened into scrollable sections with collapsibles
- **Per-quarter checklist duplication** — single readiness checklist instead

## Implementation Steps

### Step 1: Create TaxCopilotPage component
New file `src/pages/TaxCopilotPage.tsx` that composes:
- Status banner (new, ~30 lines)
- KPI strip (extracted from TrackerTab)
- TaxEstimatorCard (existing, no changes)
- Quarterly timeline (simplified from TrackerTab)
- Reserve preference (extracted from TrackerTab)
- Deductions section (from DeductionsTab)
- Guidance + CPA Prep sections (from GuidanceTab, CPAPrepSummaryTab, MyCPAQuestionsTab)
- Ask Advisor collapsible (from AskAdvisorTab)

### Step 2: Create TaxStatusBanner component
New file `src/components/tax-copilot/TaxStatusBanner.tsx`
- Takes: reserve amount, estimated liability, quarter statuses
- Returns: colored banner with icon + message + suggested action

### Step 3: Update BusinessPage
- Remove "Tax Advisor" tab button
- Rename "Estimated Tax Tracker" to "Tax Copilot"  
- Route to new TaxCopilotPage instead of TaxStrategyPage

### Step 4: Create useTaxCopilot hook
Combine data loading from `TrackerTab` + `useTaxAdvisor` into one hook that loads: tax_settings, quarter_statuses, checklist_items, deduction_categories, tax_advisor_profiles, sessions, questions, review_items. Single loading state.

### Step 5: Wire up sections
Each section uses Collapsible for progressive disclosure. Estimator + quarterly timeline are always visible. Deductions, guidance, CPA prep, and advisor chat are collapsible with sensible defaults (deductions open, others closed).

## No Database Changes
All data already exists in:
- `tax_settings`, `tax_quarter_statuses`, `tax_checklist_items` (tracker)
- `deduction_categories` (deductions)
- `tax_advisor_profiles`, `tax_advisor_sessions`, `saved_tax_questions`, `tax_opportunity_review_items` (advisor)
- `invoices`, `shifts` (income data via DataContext)

## What Users See After

One tab called "Tax Copilot" that answers in order:
1. **Am I on track?** (status banner — instant anxiety reduction)
2. **How much have I made?** (KPI strip)
3. **What do I owe?** (estimator with quarterly breakdown)
4. **What's my next payment?** (quarterly timeline)
5. **What can I deduct?** (write-offs section)
6. **What should I ask my CPA?** (guidance + prep)
7. **I have a specific question** (AI advisor)

This matches exactly what the survey data asks for: "Help me run relief like a business without guessing what to save, what to deduct, and what to pay each quarter."

