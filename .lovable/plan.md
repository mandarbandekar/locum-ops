

# Redesign Business Module as a Revenue-to-Tax Workflow

## Current Problem

The Business page has 4 tabs (Insights, Expenses, Tax Tracker, Tax Advisor), but Expenses and Tax Planning already have their own sidebar entries at `/expenses` and `/tax-planning`. This creates duplication and a fragmented experience. Users can't see how their revenue connects to their tax obligations or CPA prep.

## New Structure: Three Focused Tabs

Rename the page to **Relief Business Insights** and restructure into three tabs that tell a story: **Earn → Owe → Prepare**.

```text
┌─────────────────────────────────────────────────┐
│ Relief Business Insights                        │
│ Your revenue, tax obligations, and CPA prep     │
├─────────────────────────────────────────────────┤
│ [Revenue & Work]  [Tax Estimate]  [CPA Prep]    │
└─────────────────────────────────────────────────┘
```

### Tab 1: Revenue & Work (existing Insights/Reports)
The current ReportsPage content stays here -- AI summary, KPI cards, charts. No changes to this tab's internals.

### Tab 2: Tax Estimate (merge Tax Tracker + Tax Advisor's Ask/S-Corp)
Combines the Estimated Tax Tracker (reserve calculations, quarterly status) with the Ask Advisor chat and S-Corp Explorer into one tab. The flow is: see what you owe, then ask questions about it.

Layout:
- Top: KPI strip from TrackerTab (YTD income, estimated tax, reserve status, next due date)
- Middle: Quarterly cards with status/checklist (from TrackerTab)
- Bottom: Collapsible "Ask the Tax Advisor" section (the existing AskAdvisorTab) and "S-Corp Explorer" section (existing SCorpAssessmentTab)

### Tab 3: CPA Prep (merge Relief Deduction Guide + CPA Prep Summary)
Everything a user needs before meeting their CPA. Combines:
- The Relief Deduction Guide (opportunity review cards)
- The CPA Prep Summary (questions list + copy-able summary)
- The Intake Profile sidebar card

Layout:
- Left (main): Relief Deduction Guide at top, then CPA Questions + Summary below
- Right (sidebar): IntakeCard (existing)

### What gets removed from sidebar
- **Tax Planning** (`/tax-planning`) sidebar entry is removed -- its content is absorbed into the Business module's Tab 2 and Tab 3
- The `/tax-planning` route becomes a redirect to `/business?tab=tax-estimate`

### What stays separate
- **Expenses & Mileage** stays as its own sidebar entry at `/expenses` -- it's a daily-use tool, not a periodic reporting view
- Remove the Expenses tab from BusinessPage since it already has its own route

## Cross-linking

- Add a "View in Tax Estimate" link on the Revenue tab's income KPI card, so users can jump from seeing revenue to seeing what they owe
- Add a contextual banner on the Tax Estimate tab showing YTD revenue pulled from the same data, creating continuity

## Files to Change

| File | Change |
|------|--------|
| `src/pages/BusinessPage.tsx` | Remove Expenses and Tax Advisor tabs; restructure to 3 tabs: Revenue & Work, Tax Estimate, CPA Prep |
| `src/pages/TaxStrategyPage.tsx` | Keep as-is (used inside BusinessPage Tab 2) |
| `src/pages/TaxPlanningAdvisorPage.tsx` | Keep as-is but no longer used as standalone route |
| `src/components/AppSidebar.tsx` | Remove "Tax Planning" nav item |
| `src/App.tsx` | Change `/tax-planning` to redirect to `/business?tab=tax-estimate`; remove standalone TaxPlanningAdvisorPage import for that route |
| `src/components/business/TaxEstimateTab.tsx` | **Create** -- wraps TrackerTab + AskAdvisorTab + SCorpAssessmentTab with collapsible sections |
| `src/components/business/CPAPrepTab.tsx` | **Create** -- wraps OpportunityReviewTab + CPAPrepSummaryTab + IntakeCard in a 2-column layout |

## Technical Notes

- TaxEstimateTab imports and renders TrackerTab directly, then adds collapsible sections for AskAdvisorTab and SCorpAssessmentTab below it, sharing the same `useTaxAdvisor()` hook
- CPAPrepTab uses `useTaxAdvisor()` to get profile, questions, reviewItems and passes them to the existing sub-components
- The disclaimer banners (AdvisorDisclaimerBanner, TaxDisclaimerBanner) are consolidated into a single banner shown once at the page level
- Tab state uses `searchParams.get('tab')` as BusinessPage already does

