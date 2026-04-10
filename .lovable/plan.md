

# Email & SMS Reminders: Invoice + Credential Expiration

## What Already Exists

The infrastructure is solid:
- **`send-reminder-emails`** edge function already sends invoice draft/overdue/uninvoiced-shift reminders via the email queue
- **`send-shift-reminders`** edge function sends shift-ending-soon alerts (email + SMS via Twilio)
- **Reminder preferences** system: per-category enable/disable, channel toggles (email/SMS/in-app), quiet hours, timing config
- **`reminderEngine.ts`** has `generateCredentialReminders()` but it only feeds in-app dashboard items — no email/SMS is wired up
- **Email templates** exist for invoices and shifts, but none for credential expiration
- The credential reminder window is currently 30 days — user wants 60 days

## What Needs to Change

### 1. New email template: `credential-reminder.tsx`
Create `supabase/functions/_shared/email-templates/credential-reminder.tsx` — a branded email for credential expiration warnings. Shows credential name, expiration date, days remaining, and a CTA button linking to `/credentials`.

### 2. Expand `send-reminder-emails` edge function
Add a **credential expiration** section (alongside the existing invoice logic):
- Query `credentials` table for each user — find credentials expiring within 60 days
- Dedup: check `reminders` table — only send once per credential per 14-day window (so users get ~4 reminders: at 60, 46, 32, 18 days out, then the existing in-app picks up at 30 days)
- Respect `reminder_category_settings` for the `credentials` category
- Render the new `credential-reminder.tsx` template and enqueue via `enqueue_email`
- Log to `email_send_log` and `reminders` table

### 3. Add SMS for invoice + credential reminders
The SMS path already works for shift reminders via Twilio gateway. Extend:
- In `send-reminder-emails`: after enqueuing email, check if user has SMS enabled for the category + has a phone number configured
- Send a concise SMS via Twilio gateway for overdue invoices and credentials expiring within 14 days (not every reminder — SMS should be reserved for urgent items)

### 4. Update `reminderEngine.ts` default window
Change `generateCredentialReminders` default `windowDays` from 30 to 60 so the in-app dashboard also surfaces these earlier.

### 5. Update the "Send Reminders Now" button
Currently only triggers invoice reminders. Update the button label and description to reflect that it now also sends credential reminders.

### 6. Update tests
Add credential reminder test cases to `reminders.test.ts` for the 60-day window.

## Design Considerations

- **Frequency control**: Credential reminders re-send every 14 days (not daily) to avoid fatigue. Invoice overdue reminders already dedup daily.
- **SMS conservatism**: SMS only for overdue invoices and credentials expiring within 14 days — keeps SMS costs low and messages high-signal.
- **Email recipient**: Uses auth email (login email) as requested — the existing fallback chain already does this: `reminder_email → invoice_email → auth email`.
- **No new tables or migrations needed** — uses existing `reminders`, `reminder_preferences`, `reminder_category_settings`, and `email_send_log`.

## Files to Modify
- **New**: `supabase/functions/_shared/email-templates/credential-reminder.tsx`
- **Edit**: `supabase/functions/send-reminder-emails/index.ts` (add credential section + SMS)
- **Edit**: `src/lib/reminderEngine.ts` (change default window to 60 days)
- **Edit**: `src/pages/SettingsRemindersPage.tsx` (update button label/description)
- **Edit**: `src/test/reminders.test.ts` (update credential window tests)

