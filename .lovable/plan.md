## Goal
On the Founder dashboard, let me click any user row to expand it and see a plain-English description of what they did in their most recent session (since their last sign-in event).

## Backend: new RPC `get_user_latest_session_activity(_user_id uuid)`

A `SECURITY DEFINER` function, gated to the same admin emails as `get_founder_overview`. Steps:

1. Find the latest `created_at` from `user_sign_in_events` for the user. If none, fall back to "last 24h".
2. Across these tables, count rows where `created_at >= session_start` OR `updated_at >= session_start` for the user:
   - Core: `shifts`, `invoices`, `expenses`
   - Compliance & facilities: `credentials`, `credential_documents`, `facilities`, `contracts`
   - Other trackable: `time_blocks`, `reminders`, `ce_entries`, `tax_payment_logs`, `confirmation_records`, `invoice_pdf_downloads` (downloads use `last_downloaded_at`)
3. Return a single row with `session_start`, `device_type` (from the sign-in event), and an integer count per entity, plus the most recent touched entity's table name + timestamp so we can say "Last action: …".

Returning structured counts (not a pre-built sentence) keeps the function cheap and lets the frontend format copy in our tone.

## Frontend

**`src/pages/FounderDashboardPage.tsx`**
- Make each user row clickable to toggle an expanded panel below it (track `expandedUserId` in state).
- On expand, lazy-call the new RPC for that user, cache result in a `Map<userId, summary>`.
- Render a small panel with:
  - Session window: "Since sign-in 3h ago on mobile"
  - One-sentence deterministic summary built from the counts, e.g.:
    > Added 2 shifts, generated 1 invoice, logged 3 expenses, and uploaded 1 credential document.
  - Empty-state copy when nothing changed: "Signed in but didn't make any changes."
  - "Last action: updated an invoice • 12 min ago"
- Loading + error states inline in the panel.

### Copy rules
- Calm-competent-colleague tone, no emoji.
- Verb mapping per entity: shifts→added/updated, invoices→generated/updated, expenses→logged, credentials/documents→uploaded, facilities→added, contracts→saved, time_blocks→blocked, reminders→set, ce_entries→logged CE, tax_payment_logs→recorded tax payment, confirmation_records→sent confirmations, invoice_pdf_downloads→downloaded invoice PDFs.
- Skip entities with zero counts. Join with commas and "and".

## Out of scope
- No AI generation.
- No new column in the main table — the summary lives only in the expanded row.
- No changes to the existing `get_founder_overview` function.
- No new tracking/instrumentation; we only summarize what already exists in the DB.
