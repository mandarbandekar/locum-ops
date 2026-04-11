

# Combine Reminder Emails into Digest Format

## Problem
Currently the system sends **one email per overdue invoice** and **one email per expiring credential**. If a user has 3 overdue invoices and 4 expiring credentials, they get 7 separate emails. Draft invoices are already batched, but overdue and credentials are not.

## Solution
Consolidate each category into a single digest-style email per run:
- **One "Invoice Summary" email** covering all drafts + all overdue invoices in a single message
- **One "Credentials Summary" email** covering all expiring/expired credentials in a single message

This reduces inbox noise from N emails to at most 2.

## Changes

### 1. New email template: `_shared/email-templates/invoice-digest.tsx`
A combined invoice reminder that lists:
- A "Ready to Send" section with draft invoices (count + total + individual line items)
- An "Overdue" section with overdue invoices (each with number, facility, amount, days overdue)
- Single CTA button: "Review Invoices"

### 2. New email template: `_shared/email-templates/credential-digest.tsx`
A combined credential reminder that lists:
- An "Urgent" section for credentials expiring within 14 days or already expired
- An "Upcoming" section for credentials expiring within 15-60 days
- Each row: credential name, expiration date, days remaining
- Single CTA button: "View Credentials"

### 3. Update `send-reminder-emails/index.ts`
- **Invoice section**: Collect all drafts and all overdue invoices, then send ONE email using the new digest template instead of calling `enqueueDraftReminder` + looping `enqueueOverdueReminder`
- **Credential section**: Collect all expiring credentials (after dedup filtering), then send ONE email using the new digest template instead of looping per credential
- Keep SMS behavior as-is (individual SMS for high-urgency items is fine — those are short and actionable)
- Keep the per-item dedup logic for credentials (14-day window) but apply it to the batch: if ALL credentials in the batch were already reminded, skip; if any are new, send the digest with all current items
- Uninvoiced shifts section stays unchanged (already grouped by facility)

### 4. Simplify old templates
Keep the single-item templates (`invoice-reminder.tsx`, `credential-reminder.tsx`) for the payment reminder flow (which sends to clinics, not the user) but the user-facing reminder path switches entirely to digests.

### 5. Redeploy
Deploy the updated `send-reminder-emails` edge function.

## Template Design
Both digest templates will use the same brand styling (Inter font, teal primary, red for urgent) and render a clean table/list of items with visual urgency indicators.

## No database changes needed
The `reminders` table entries will use a new `reminder_type` like `invoice_digest` and `credential_digest` for dedup tracking.

