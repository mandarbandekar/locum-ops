

# Cross-Check: Reminder Categories vs Rules

## Summary of Findings

There are **three alignment issues** between the reminder categories users can configure in Settings and what actually happens in the app.

---

## Issue 1: Dashboard ignores user preferences

The dashboard "Needs Attention" card calls generator functions directly and never runs `filterByPreferences()`. If a user disables "Invoices" or "Credentials" in Settings → Reminders, those items still appear on the dashboard.

**Fix**: After building the `attentionItems` array in `DashboardPage.tsx`, apply `filterByPreferences()` using the user's `reminder_category_settings` before rendering. This requires importing `useReminderPreferences` in the dashboard.

---

## Issue 2: `contracts` and `taxes` categories have no engine mapping

The Settings page lets users toggle these categories, but:
- Contract checklist items are built inline in the dashboard with no `module` tag
- Tax quarter reminders are built inline with no `module` tag
- S-Corp nudge is built inline with no `module` tag

These bypass the filter system entirely, so toggling "Contracts" or "Taxes" off does nothing.

**Fix**: Tag the inline dashboard items with the correct module (e.g., wrap them through the filter, or assign a `module` property and filter at the end). The simplest approach: add a `module` field to `AttentionItem`, tag each item, and filter the final list against category settings.

---

## Issue 3: `shifts` category only controls edge function behavior

The `shifts` category in Settings only governs the `send-shift-reminders` edge function (1-hour-before email/SMS). There are no in-app reminders with `module: 'shifts'`. The uninvoiced shift nudges use `module: 'invoices'` — which is correct semantically, but users might expect "Shifts" to control those too.

**Fix**: This is actually correct behavior (uninvoiced shifts = invoicing concern, not scheduling). No code change needed, but we could add a helper note in the Settings UI under the "Shifts" category: "Controls pre-shift-end email and SMS alerts."

---

## Implementation Plan

**1 file changed**: `src/pages/DashboardPage.tsx`

- Import `useReminderPreferences`
- Add `module` field to the `AttentionItem` interface
- Tag each attention item with its module (`invoices`, `confirmations`, `credentials`, `contracts`, `taxes`, `outreach`)
- After building and sorting the array, filter out items whose category is disabled or has `in_app_enabled: false`

**1 file optionally touched**: `src/pages/SettingsRemindersPage.tsx`

- Add a small helper line under the "Shifts" category label: "Pre-shift-end email & SMS alerts"
- Add helper under "Contracts": "Checklist due dates"
- Add helper under "Taxes": "Quarterly tax deadlines & S-Corp nudge"

This ensures what users see in Settings actually controls what appears, with no silent bypasses.

