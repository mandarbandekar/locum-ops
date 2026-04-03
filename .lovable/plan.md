

# Fix Reminder Email Delivery

## Problem

<lov-plan>

# Fix Reminder Email Delivery

## Problem

All reminder emails fail with `"Run not found or expired"` and end up in the dead-letter queue after 5 retries. This has been happening since the reminder system was built — zero reminder emails have ever been delivered.

## Root Cause

Both `send-reminder-emails` and `send-shift-reminders` enqueue emails with `run_id: crypto.randomUUID()`. This is a fake run ID that doesn't exist in the Lovable email API. The queue processor (`process-email-queue`) passes this invalid `run_id` to `sendLovableEmail`, which rejects it with a 404.

The correct pattern (per the email infrastructure) is to omit `run_id` and instead provide `idempotency_key` + `purpose: "transactional"`. The API then creates a run inline.

## Fix

**2 files changed**: `send-reminder-emails/index.ts` and `send-shift-reminders/index.ts`

In every `enqueue_email` payload across both files:
- Remove `run_id: crypto.randomUUID()`
- Add `idempotency_key: messageId` (already a unique UUID per email)
- Keep `purpose: 'transactional'` (already present)

There are **6 call sites total** (5 in `send-reminder-emails`, 1 in `send-shift-reminders`).

Both functions will be redeployed after the change.

## Validation

- Invoke `send-reminder-emails` and check that emails move from `pending` to `sent` in `email_send_log` instead of failing
- Verify no more "Run not found" errors in the queue processor logs

