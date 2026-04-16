

## The problem

The invoice detail screen today juggles three overlapping UIs that duplicate the same actions:

1. **`InvoiceEditPanel`** (left column) — From, Bill To, fields, line items, balance card.
2. **`InvoicePreview`** (right column, sticky) — visual preview.
3. **`InvoiceSentPanel`** — a parallel "Send & Share" view used elsewhere with its own send/resend/share/balance/line-items cards.
4. **`InvoiceActionBar`** (fixed bottom) — duplicates Save / Send / PDF / Record Payment / Share.
5. **Inline Send button** under the preview — *another* send CTA.
6. **`InvoiceStepper`** — clickable Draft → Sent → Paid header with a confirmation dialog for backward moves.
7. **"Revert to Draft"** card — yet another way to change state.

The user lands on a "post-send" view that still loudly says "Send invoice to..." again, because we re-render the same compose CTA in three places without distinguishing pre-send vs post-send context. Status changes happen in 4 different spots (stepper, action bar, sent panel, edit panel). It's confusing because it's actually four UIs stacked on one route.

## Proposed UX: one screen, one action zone, status-aware

**Principle:** Same screen for the entire lifecycle. The *content* (line items, dates, preview) stays put. Only one **Action Zone** changes based on status. Eliminate `InvoiceSentPanel` as a separate panel — fold its logic into the unified screen.

### New layout (desktop, single screen)

```text
┌─────────────────────────────────────────────────────────────┐
│ ← INV-0042 · Greenfield Medical Center      [Status pill]   │
├─────────────────────────────────────────────────────────────┤
│ Status strip:  ●━━━━━━○─────○   Draft → Sent → Paid         │
│                  (read-only progress, no clicks)            │
├──────────────────────────────┬──────────────────────────────┤
│  EDITOR (left, 2/5)          │  PREVIEW (right, 3/5 sticky) │
│  • From / Bill to            │  Live invoice preview        │
│  • Invoice # / dates         │  (always visible, always     │
│  • Line items (editable in   │   reflects current state)    │
│    Draft, read-only after)   │                              │
│  • Notes                     │                              │
│  • Activity (collapsible)    │                              │
└──────────────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  ACTION ZONE (sticky bottom — single source of truth)        │
│                                                              │
│  DRAFT:    [Total $X]  [PDF] [I already sent it] [Send →]   │
│  SENT:     [Bal $X · Sent Apr 12]  [PDF] [Resend] [Record   │
│            Payment]                                          │
│  OVERDUE:  [Bal $X · 12d overdue]  [PDF] [Send follow-up]   │
│            [Record Payment]                                  │
│  PARTIAL:  [Bal $X · partially paid]  [PDF] [Send follow-up]│
│            [Record Payment]                                  │
│  PAID:     [Paid in full · Apr 18]  [PDF] [Share link]      │
└─────────────────────────────────────────────────────────────┘
```

Mobile collapses to a Tabs (Edit | Preview) — same as today — with the same single Action Zone pinned to the bottom.

### What gets removed

1. **`InvoiceSentPanel.tsx`** — delete. Its responsibilities (send confirmation, resend, share link, balance card, payment history, revert) merge into the unified screen.
2. **Inline "Send Invoice to..." CTA below the preview** — gone. The bottom Action Zone is the only send entry point.
3. **Clickable `InvoiceStepper`** — becomes a passive progress indicator. No more "Move to" confirmation dialog (`moveDialogOpen`). Backward moves only happen via the explicit "Revert to Draft" button in an overflow menu.
4. **"I already sent this" duplication** — only in the Action Zone (Draft state).
5. **Floating bottom `InvoiceActionBar`** + inline preview Send button + "Revert to Draft" card — consolidated into one bottom bar.

### Post-send clarity (the user's complaint)

Once `sent_at` is set:
- The hero of the bottom bar becomes **"Sent to {name} · Apr 12 at 4:12 PM"** with a subtle ✓.
- Primary CTA flips to **"Record Payment"** (the next logical action).
- Send becomes a quiet **"Resend"** secondary button, not a screaming primary CTA.
- Balance Due is shown inline in the bar, not in a separate card.
- Share link, PDF download move into a small **⋯ More** menu to declutter.

This solves the screenshot issue: after sending, the user sees a confirmation (not "Send invoice to..." again), and the next step (Record Payment) is the obvious primary action.

### Compose dialog (unchanged)

Stays the same component. Opens in `'initial'` mode for never-sent invoices, `'followup'` mode when `isInvoiceOverdue` is true. Triggered only from the Action Zone.

### State changes

- Remove `moveDialogOpen`, `moveTarget`, `handleStatusTransition`, `handleStepClick` from `InvoiceDetailPage`.
- Remove the `Revert to Draft` card from `InvoiceEditPanel` (the action moves into a "⋯ More" menu in the Action Zone, available from any post-Draft status).
- `InvoiceActionBar` is rewritten to be *the* status-aware control center.

### Files to change

1. **`src/pages/InvoiceDetailPage.tsx`** — remove dual Send CTAs, remove stepper click handlers + Move dialog, delete the extra inline Send under preview, simplify layout.
2. **`src/components/invoice/InvoiceActionBar.tsx`** — rewrite as the single status-aware bar (Draft/Sent/Overdue/Partial/Paid branches, with sent confirmation chip, balance, primary next-action, "⋯ More" menu containing PDF, Share link, Resend, Revert to Draft).
3. **`src/components/invoice/InvoiceStepper.tsx`** — remove click handlers/tooltips, make it a passive indicator.
4. **`src/components/invoice/InvoiceEditPanel.tsx`** — remove the "Balance Due" card (now in Action Zone), remove the "Revert to Draft" card, keep only From/BillTo/Fields/LineItems/Notes/Payment history.
5. **`src/components/invoice/InvoiceSentPanel.tsx`** — **delete** (and remove its imports from `InvoicesPage` if any — check).
6. Tests: `src/test/invoiceOnboarding.test.ts` — verify nothing references removed components.

### Behavioral guarantees

- Auto-save on Draft fields stays (debounced 800ms).
- "Ready to Send" checklist stays in the alerts strip above the layout (Draft only).
- Overdue alert banner stays (Overdue only).
- Compose dialog deep-link `?action=followup` continues to work.
- All status transitions remain reversible via "Revert to Draft" in the More menu.

