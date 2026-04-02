

# Redesign Business Tax Features — Estimated Tax Copilot

## Analysis: What Exists vs What Users Want

**Current structure** (3 tabs under Business):
- **Insights** — revenue charts, facility analytics
- **Estimated Tax Tracker** — quarterly reserve calc, IRS installment method, readiness checklist
- **Tax Advisor** — AI chat (5 sub-tabs: Ask, Entity Guidance, Opportunity Review, CPA Questions, CPA Prep Summary)

**Hidden/orphaned features:**
- **DeductionsTab** — fully built deduction tracker with 16 relief-specific categories, but NOT rendered anywhere in the current UI
- **CPAPacketTab** — fully built CPA packet generator, also NOT rendered anywhere

**Survey-driven framework (4 parts):**
1. Tax Reserve Dashboard → exists (TrackerTab)
2. Quarterly Tax Workflow → exists (TrackerTab)
3. Deduction Tracker → exists but **invisible**
4. 1099/S-Corp Guidance → exists (spread across Tax Advisor sub-tabs)

**The core problem is information architecture, not missing features.** Users have to navigate between two separate tabs (Tax Tracker vs Tax Advisor) to get a complete picture. Key features are hidden. The hierarchy is confusing — 3 top-level tabs with 5 sub-tabs under one of them.

## Proposed Redesign

### New Tab Structure (under Business)

Replace the current 3 tabs with 4 user-intent-aligned tabs:

```text
Business
├── Insights (unchanged)
├── Tax Reserve       ← renamed from "Estimated Tax Tracker"
├── Deductions        ← resurface the hidden DeductionsTab  
└── Tax Planning      ← consolidation of Tax Advisor features
```

### Tab 1: Insights (no changes)
Revenue charts, facility analytics — stays as-is.

### Tab 2: Tax Reserve (refocused TrackerTab)
**What changes:**
- Rename from "Estimated Tax Tracker" to "Tax Reserve" (matches survey language: "how much to reserve")
- Keep: summary cards (YTD income, est. liability, reserve, next due), quarterly planning cards, reserve preference, tax estimator
- **Move the readiness checklist OUT** — it's CPA-prep focused and belongs in Tax Planning
- **Add a simple "status strip"** at top with plain-language: "You've earned $X this year. Based on your filing status, set aside ~$Y. You're [ahead/behind/on track]."

### Tab 3: Deductions (resurface hidden tab)
**What changes:**
- Surface the existing `DeductionsTab` component which is already fully built with 16 relief-specific categories
- This directly addresses the #1 survey pain: "tracking deductions / write-offs"
- No code changes needed to the component itself — just wire it into the tab navigation

### Tab 4: Tax Planning (consolidate advisor + guidance + CPA prep)
**What changes:**
- Merge the current Tax Advisor page and orphaned CPAPacketTab into a streamlined layout
- Sub-tabs become: **Ask Advisor**, **Write-Offs & Entity Guide** (merge Entity Guidance + Opportunity Review), **CPA Prep** (merge CPA Questions + CPA Prep Summary + CPAPacketTab)
- Keep the intake sidebar
- This reduces 5 sub-tabs to 3, cutting cognitive load

## Implementation Plan

### File: `src/pages/BusinessPage.tsx`
- Add 4th tab button "Deductions" with `Receipt` icon
- Rename "Estimated Tax Tracker" → "Tax Reserve"
- Rename "Tax Advisor" → "Tax Planning"
- Import and render `DeductionsTab` for the deductions tab
- Update tab keys: `reports`, `tax-reserve`, `deductions`, `tax-planning`

### File: `src/pages/TaxStrategyPage.tsx`
- Remove readiness checklist reference (move to Tax Planning)

### File: `src/components/tax-strategy/TrackerTab.tsx`
- Add plain-language status strip at top ("You're on track / behind / ahead")
- Extract readiness checklist into separate component for reuse in Tax Planning tab

### File: `src/pages/TaxPlanningAdvisorPage.tsx`
- Consolidate 5 sub-tabs into 3:
  - "Ask Advisor" (unchanged)
  - "Write-Offs & Entity Guide" (merge GuidanceTab + OpportunityReviewTab into one scrollable view)
  - "CPA Prep" (merge MyCPAQuestionsTab + CPAPrepSummaryTab + CPAPacketTab into one flow)

### No database changes required
All tables and data already exist.

## What Users See After

```text
Business > Tax Reserve
┌──────────────────────────────────────────┐
│ 💡 You've earned $52,400 this year.      │
│    Set aside ~$14,200. You're on track.  │
├──────────────────────────────────────────┤
│ [YTD Income] [Est. Tax] [Reserve] [Next] │ ← summary cards
│ [Tax Estimator Card]                     │
│ [Reserve Preference]                     │
│ [Q1] [Q2] [Q3] [Q4] quarterly cards     │
└──────────────────────────────────────────┘

Business > Deductions
┌──────────────────────────────────────────┐
│ 16 relief-specific categories            │
│ YTD amounts, receipt status, docs needed │
└──────────────────────────────────────────┘

Business > Tax Planning
┌──────────────────────────────────────────┐
│ [Ask Advisor] [Guidance] [CPA Prep]      │
│ AI chat + entity/deduction guidance      │
│ + CPA questions + exportable summary     │
│                          [Intake Sidebar]│
└──────────────────────────────────────────┘
```

Four clear tabs that answer the four survey questions:
1. "How much should I save?" → **Tax Reserve**
2. "What can I track/write off?" → **Deductions**
3. "What should I know about entity/structure?" → **Tax Planning > Guidance**
4. "What do I ask my CPA?" → **Tax Planning > CPA Prep**

