

# Invoice Reminder System — Full Plan

## What We're Building

A comprehensive reminder system that nudges users about uninvoiced shifts, overdue payments, and upcoming shift-end billing windows — via in-app notifications, email, and SMS.

### Three Core Reminder Flows

1. **Uninvoiced Shifts Nudge** — "You worked 3 shifts at Riverside last week — ready to invoice?" Surfaces on dashboard and sent via email/SMS.

2. **Overdue Payment Follow-Up** — Already partially built (email edge function exists). Add one-click "send reminder to clinic" from the invoice detail page, plus SMS channel.

3. **Shift-End Billing Nudge** — 1 hour before each shift ends, send email + SMS: "Your shift at Riverside ends soon — invoice will be auto-generated." Reinforces trust in the auto-invoicing system.

---

## What Already Exists

- `reminders` table (DB) — stores sent/scheduled reminders with module, channel, status
- `reminder_preferences` + `reminder_category_settings` tables — user prefs for channels/categories/timing/quiet hours
- `send-reminder-emails` edge function — hourly cron, sends draft-unsent and overdue invoice emails via Lovable Email queue
- `reminderEngine.ts` — pure functions generating invoice, confirmation, outreach, credential reminders
- Settings page for managing reminder preferences
- Email infrastructure: domain configured (notify.locum-ops.com), pgmq queue, process-email-queue cron

**Not yet built:** Uninvoiced shifts detection, SMS delivery, shift-end pre-reminders, dashboard "uninvoiced shifts" card.

---

## Implementation Plan

### Step 1: Uninvoiced Shifts Detection Logic

Add to `reminderEngine.ts`:
- `generateUninvoicedShiftReminders(shifts, invoiceLineItems, facilities, now)` — finds shifts that ended >24h ago with no linked invoice line item, groups by facility, returns reminders like "3 shifts at Riverside last week ($2,400) — ready to invoice?"

### Step 2: Dashboard "Uninvoiced Shifts" Card

Add to `DashboardPage.tsx` attention items:
- New attention item type showing uninvoiced shift count + total dollar amount
- Links to invoices page with a prompt to create invoice
- Uses the new `generateUninvoicedShiftReminders` function

### Step 3: SMS Infrastructure (Twilio Connector)

- Connect Twilio via the connector system
- Create `send-reminder-sms` edge function that:
  - Reads user's phone number from `reminder_preferences`
  - Checks SMS is enabled for the category
  - Respects quiet hours
  - Sends via Twilio gateway
- User provides Twilio credentials (Account SID, Auth Token, From number)

### Step 4: Shift-End Pre-Reminder (1 Hour Before)

New edge function `send-shift-reminders` with a **per-minute cron**:
- Queries shifts ending between now and now+65 minutes (5-min buffer)
- Checks `reminders` table to avoid duplicates (dedup by shift_id + reminder_type)
- For each qualifying shift:
  - **Email**: "Your shift at {Facility} ends at {time} — your invoice will be auto-generated"
  - **SMS**: Short version of the same
- Respects user preferences (channel toggles, quiet hours)

### Step 5: Expand send-reminder-emails for Uninvoiced Shifts

Update the existing hourly `send-reminder-emails` function to also:
- Detect uninvoiced shifts (shifts with no invoice line items, ended >24h ago)
- Send "ready to invoice?" email nudge (new email template)
- Dedup: only send once per facility per week

### Step 6: One-Click "Send Reminder to Clinic" on Overdue Invoices

On `InvoiceDetailPage`:
- Add "Send Payment Reminder" button for overdue invoices
- Generates a professional email to the facility's billing contact
- Uses existing email queue infrastructure
- Logs to `email_logs` and `reminders` tables

### Step 7: Email Template for Uninvoiced Shifts

New React Email template `shift-reminder.tsx`:
- "You worked {count} shifts at {facility} — ready to invoice?"
- Shows shift dates, estimated total
- CTA button: "Create Invoice"

### Step 8: Tests

Update `src/test/reminders.test.ts`:
- Test `generateUninvoicedShiftReminders` with various scenarios
- Test shift-end reminder timing logic
- Test deduplication rules

---

## Database Changes

**Migration: Add columns to `reminders` table**
```sql
-- No new tables needed. Add a unique constraint for dedup:
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_dedup
  ON reminders (user_id, module, reminder_type, channel, related_entity_id)
  WHERE status IN ('scheduled', 'sent') AND sent_at > now() - interval '7 days';
```

No new tables — the existing `reminders`, `reminder_preferences`, and `reminder_category_settings` tables cover all needs.

---

## SMS Setup (Requires User Action)

SMS delivery requires a Twilio account. When we reach that step:
1. Connect Twilio via the connectors system
2. User provides their Twilio phone number
3. The `phone_number` field already exists in `reminder_preferences`

---

## Cron Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| `send-reminder-emails-hourly` | Every hour | Draft/overdue/uninvoiced email nudges |
| `send-shift-reminders` (new) | Every minute | Shift-end pre-reminders (email + SMS) |
| `process-email-queue` | Every 5 seconds | Queue dispatcher (already exists) |

---

## What Users Experience

1. **Dashboard**: See "3 uninvoiced shifts — $2,400" in the Needs Attention card
2. **1 hour before shift ends**: Get email + SMS "Your shift at Riverside ends at 5pm"
3. **Next morning**: If shifts went uninvoiced, get email "Ready to invoice 3 shifts at Riverside?"
4. **Overdue invoices**: One-click button to send payment reminder to clinic
5. **Settings**: Full control over which channels (email/SMS/in-app) and categories are active

## Implementation Order

1. Uninvoiced shifts logic + dashboard card (immediate value, no backend needed)
2. Email template + expand hourly edge function for uninvoiced nudges
3. Shift-end pre-reminder edge function + cron
4. SMS infrastructure (Twilio connector + edge function)
5. One-click overdue reminder on invoice detail
6. Tests

