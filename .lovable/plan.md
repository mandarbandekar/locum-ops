

# Improve Tax Advisor UX — Output-First, Input-Light

## Problem

The current Tax Advisor is tab-heavy (5 tabs), input-heavy, and doesn't reward users with visible value until they've done significant work. The Opportunity Review shows 8 fully-expanded cards of text. The sidebar intake form feels like homework. Users need to see value first, then be nudged to provide more context.

## Design Approach

**Principle**: Show useful output immediately. Use what we already know (facilities, invoices, profile). Nudge for input only when it unlocks better results.

## Changes

### 1. Reduce tabs from 5 to 3

Merge "Entity Guidance" into the Ask Advisor tab as suggested prompt chips. Merge "My CPA Questions" into "CPA Prep Summary" as a single "CPA Prep" tab.

New tabs: **Ask Advisor** | **Opportunity Review** | **CPA Prep**

### 2. Redesign Ask Advisor tab — prompt chips + profile nudge

- Add a row of quick-start prompt chips above the input: "CE & travel deductions", "Vehicle mileage strategies", "S-Corp vs sole proprietor", "Retirement account options", "Multi-state filing", "Home office rules"
- Clicking a chip pre-fills the input and sends immediately
- If no profile is saved, show a soft inline banner above the input: "Complete your planning profile to get personalized suggestions" with a "Set up profile" link that scrolls/focuses the sidebar
- Show facility count and entity type as small context chips below the input so users see the system already knows things about them

### 3. Redesign Opportunity Review — collapsed by default, suggested first

- Cards start **collapsed** (title + status badge only)
- Click to expand details (why, docs, cautions, CPA questions)
- Sort: suggested categories first, then the rest
- Add a progress strip at top: "3 of 8 areas reviewed" with a small progress bar
- Add one-click "Save question to CPA list" buttons on each suggested CPA question inside the expanded card

### 4. Redesign sidebar IntakeCard — progress + value framing

- Add a completion indicator: "Profile 3/8 complete" with a thin progress bar
- Reframe the title from "Your Planning Profile" to "Personalize Your Results"
- Add a subtle note under incomplete fields: "Answering this helps us surface relevant deductions"
- After saving, show a brief confirmation with what changed: "Updated — your Opportunity Review now highlights Vehicle & Mileage"

### 5. Merge CPA Questions + Summary into single "CPA Prep" tab

- Top section: question list (add, edit, delete, toggle include — same as current MyCPAQuestionsTab)
- Bottom section: live preview of the CPA summary (same as current CPAPrepSummaryTab)
- Remove the need to switch tabs to see how questions appear in the summary
- Keep the "Copy as Text" button

### 6. Auto-populate insights from existing data

- In the CPA Prep summary, auto-include: facility count, states worked, YTD income from invoices, entity type
- In the Opportunity Review, auto-mark "Multi-State Work" as suggested if user has facilities in 2+ states (even without profile toggle)

## Files to Change

| File | Action |
|------|--------|
| `src/pages/TaxPlanningAdvisorPage.tsx` | Reduce to 3 tabs, remove Entity Guidance and MyCPAQuestions tab imports |
| `src/components/tax-advisor/AskAdvisorTab.tsx` | Add prompt chips, profile nudge banner, context chips |
| `src/components/tax-advisor/OpportunityReviewTab.tsx` | Collapsible cards, sort suggested first, progress strip, save-question buttons |
| `src/components/tax-advisor/IntakeCard.tsx` | Progress indicator, reframed copy, contextual hints |
| `src/components/tax-advisor/CPAPrepSummaryTab.tsx` | Merge in MyCPAQuestionsTab content (add/edit/delete questions inline above preview), auto-populate data context |

## What Users See After

- **Ask Advisor**: One-click topic chips get instant AI responses. A gentle nudge to complete their profile, not a wall of switches.
- **Opportunity Review**: Clean collapsed cards, suggested ones highlighted at top, progress tracking, one-click CPA question saving.
- **CPA Prep**: Questions and summary preview in one place — no tab-switching.
- **Sidebar**: Feels like unlocking better results, not filling out forms.

