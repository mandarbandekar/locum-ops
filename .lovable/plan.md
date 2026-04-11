

# Update Settings → Reminders to Match Scoped Categories

## Problem
The Categories card currently shows all 7 categories (invoices, confirmations, shifts, credentials, contracts, outreach, taxes). Per the agreed scope, we should only show **Invoices** and **Credentials / CE** — the two categories users actually receive reminders for right now.

## Changes

### 1. `src/pages/SettingsRemindersPage.tsx`
- Filter the Categories card to only render `invoices` and `credentials` instead of iterating over all `CATEGORIES`
- Update `CATEGORY_LABELS` and `CATEGORY_DESCRIPTIONS` to only include those two, with descriptions matching the scoped reminders:
  - **Invoices**: "Invoice ready for review and overdue payment alerts"
  - **Credentials / CE**: "License expiration warnings (60 days out) and CE deadline alerts"
- Remove the unused category label/description entries (confirmations, shifts, contracts, outreach, taxes)
- Keep the timing options, channel sub-toggles, and everything else as-is

### 2. `src/hooks/useReminderPreferences.ts`
- Add an exported constant `ACTIVE_CATEGORIES = ['invoices', 'credentials'] as const` for the settings page to use instead of the full `CATEGORIES` array
- No other changes — the full `CATEGORIES` array stays for future use and DB seeding

This is a small UI-only change — no database or edge function modifications needed.

