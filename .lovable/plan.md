

# Invoice Dashboard UX Improvements

## Current State
The page has four collapsible status groups (Overdue, Sent & Awaiting Payment, Drafts, Paid) with invoice tables inside each. It works but lacks context about the workflow, summary metrics, and inline actions to guide users through the lifecycle.

## Proposed Improvements

### 1. Summary Stats Strip (top of page, above groups)
A horizontal row of 4 compact metric cards showing at-a-glance financial health:
- **Overdue** -- count + total dollar amount, red accent
- **Awaiting Payment** -- count + total, blue accent
- **Drafts to Review** -- count + total, amber accent
- **Paid (this month)** -- count + total, green accent

Each card is clickable and scrolls/focuses the corresponding group below.

### 2. Workflow Progress Indicator
A small horizontal stepper or breadcrumb-style strip between the stats and the groups, showing the invoice lifecycle:

```text
[Auto-Generated] → [Review Draft] → [Send to Facility] → [Awaiting Payment] → [Record Payment] → [Paid]
```

This is purely educational -- it helps new users understand the flow at a glance. It appears only when there are invoices. Uses subtle styling, not a large banner.

### 3. Inline Quick Actions per Group
Add contextual action hints inside each group header (right side, next to the count badge):

- **Drafts**: "Review & Send" button that navigates to the first draft invoice
- **Sent & Awaiting Payment**: Show aggregate total owed prominently (like the facility sub-totals in Drafts)
- **Overdue**: Show "days overdue" summary and a "Send Reminder" hint
- **Paid**: Show monthly/period total earned

### 4. Sent & Awaiting Payment -- Show Aggregate Total
Mirror the Drafts pattern: display a bold total dollar amount in the group header so users immediately see how much money is outstanding without expanding.

### 5. Overdue Group -- Add Urgency Cues
- Show the total overdue amount in red in the group header
- Add a subtle alert banner inside when there are overdue invoices: "You have $X overdue across N invoices. Follow up with facilities to collect payment."

### 6. Paid Group -- Monthly Summary
Show "Collected this month: $X" in the Paid group header to give users a sense of accomplishment.

---

## Technical Details

### Files to modify:
- **`src/pages/InvoicesPage.tsx`** -- Add the summary stats strip and workflow indicator components above the status groups. Compute totals from the already-grouped arrays (overdue, sent, draft, paid).
- **`src/components/invoice/InvoiceStatusGroup.tsx`** -- Extend to accept an optional `headerRight` render prop for showing totals/actions in group headers. Add aggregate total display for non-draft groups.

### New component:
- **`src/components/invoice/InvoiceSummaryStrip.tsx`** -- The 4 metric cards. Pure presentational, receives counts and totals as props.
- **`src/components/invoice/InvoiceWorkflowHint.tsx`** -- The small lifecycle stepper. Stateless, purely visual.

### No database or backend changes needed. All data is already available client-side.

