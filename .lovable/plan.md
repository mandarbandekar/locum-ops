

# S-Corp Fit Assessment & Playbook

## Concept

Add an "S-Corp Assessment" module inside the Tax Advisor section that helps locum clinicians answer the #1 question: **"Should I be an S-Corp?"** — without giving tax advice. The module has two parts: a quick fit assessment (quiz-style) and an educational playbook (reference guide).

## How It Works

### 1. Income-Triggered Prompt (Smart Nudge)

When YTD income from paid invoices crosses **$80K** (annualized), a banner appears on the Tax Tracker and Dashboard:

> "Your income may be in the range where an S-Corp structure is commonly reviewed. Want to explore if it's worth discussing with your CPA?"

This links directly to the S-Corp Assessment tab. Users below the threshold can still access it manually — the nudge just surfaces it at the right time.

### 2. S-Corp Fit Assessment (Interactive Quiz)

A 6-8 question guided assessment that produces a "fit score" with three outcomes:

| Result | Meaning |
|--------|---------|
| **Worth Exploring** | Income level + work patterns suggest discussing S-Corp with a CPA |
| **Maybe Later** | Some factors align but income or stability may not justify it yet |
| **Likely Not Now** | Current situation doesn't strongly suggest S-Corp benefits |

**Assessment questions** (all framed as educational, not advisory):
- Projected annual 1099 income range ($0-60K / $60-100K / $100-150K / $150K+)
- Income stability (steady monthly vs. seasonal/variable)
- Current entity type (sole prop / LLC / already S-Corp / unsure)
- Comfort with payroll admin (yes / no / would outsource)
- Do you have a CPA or tax professional? (yes / no / looking)
- Years in independent practice (< 1 / 1-3 / 3+)

**Scoring logic** (all client-side, no DB needed for the quiz itself):
- Income $100K+ = strong signal
- Income $60-100K = moderate signal
- Stable income + payroll comfort = positive factors
- < 1 year in practice or very variable income = caution factors

The result is saved to the `tax_advisor_profiles` table (new column: `scorp_assessment_result`) so it persists and personalizes other advisor responses.

### 3. S-Corp Playbook (Educational Reference)

A static-content reference section with collapsible cards covering:

1. **What Is an S-Corp?** — Plain-language overview for clinicians
2. **How S-Corp Taxation Works** — Salary vs. distributions concept (no specific numbers)
3. **Common Benefits Worth Reviewing** — SE tax reduction potential, reasonable compensation concept
4. **Requirements & Ongoing Obligations** — Payroll, annual filings, state fees, bookkeeping
5. **Cost of Running an S-Corp** — Typical admin costs to discuss with a CPA (payroll service, tax prep, state fees)
6. **When It Typically Makes Sense** — Income thresholds commonly discussed, stability factors
7. **Common Mistakes to Avoid** — Too-low salary, missing payroll deadlines, state-specific gotchas
8. **Questions to Ask Your CPA** — 5-7 specific questions to bring to a meeting

Each card ends with a "Save to CPA Prep" button that adds the section's CPA questions to the existing CPA Prep tab.

### 4. Personalized Savings Estimate (Educational Range)

Based on the assessment answers, show an **educational estimate range** (not a recommendation):

> "Clinicians in your income range ($100-150K) who operate as S-Corps commonly report SE tax differences of approximately $X,XXX–$Y,YYY per year. Actual results depend on reasonable compensation, state rules, and your full tax situation. Discuss with your CPA."

Formula: `(income - reasonable_salary) × 15.3%` shown as a range using two reasonable salary benchmarks. Always with disclaimer.

## Technical Plan

### New Files
1. **`src/components/tax-advisor/SCorpAssessmentTab.tsx`** — Quiz UI + results + savings estimate
2. **`src/components/tax-advisor/SCorpPlaybook.tsx`** — Collapsible educational content cards
3. **`src/lib/scorpAssessment.ts`** — Scoring logic, savings estimate calculator, content constants

### Modified Files
4. **`src/pages/TaxPlanningAdvisorPage.tsx`** — Add 4th tab: "S-Corp Explorer"
5. **`src/hooks/useTaxAdvisor.ts`** — Add `scorp_assessment_result` field to profile type, save/load assessment
6. **`src/components/tax-strategy/TrackerTab.tsx`** — Add income-triggered S-Corp nudge banner
7. **`src/pages/DashboardPage.tsx`** — Add S-Corp nudge to attention items when income threshold is met

### Database
- Add column `scorp_assessment_result` (jsonb, nullable) to `tax_advisor_profiles` table — stores quiz answers + result label + timestamp

### No Edge Function Needed
All scoring is client-side. The existing `tax-advisor-chat` edge function already handles S-Corp questions via the Ask Advisor tab.

## UX Flow

```text
User earns $80K+ annualized
  → Nudge banner on Tax Tracker / Dashboard
  → Click → S-Corp Explorer tab
  → Take 6-question assessment (2 min)
  → See result: "Worth Exploring" + savings range
  → Browse Playbook cards for education
  → Save CPA questions → CPA Prep tab
  → Book CPA meeting with prepared questions
```

## Implementation Order

1. Scoring logic + content constants (`scorpAssessment.ts`)
2. Assessment quiz UI (`SCorpAssessmentTab.tsx`)
3. Playbook content (`SCorpPlaybook.tsx`)
4. Wire into Tax Advisor page (4th tab)
5. DB migration (add jsonb column)
6. Income-triggered nudge banners
7. Tests

