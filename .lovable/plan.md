
## Goal
Replace the inline "Send Reminder" button (in the overdue alert banner near the top of the invoice detail page) so it triggers the same editable compose dialog as the "Send follow-up" button in the bottom action bar — but keep its current location and label.

## Why
The two buttons currently do contradictory things: the top one fires an email immediately with no preview, while the bottom one opens an editable compose dialog. The user prefers the compose-dialog behavior but wants to keep the convenient top placement.

## Change

**File: `src/pages/InvoiceDetailPage.tsx`** (the overdue alert block, ~lines 240–280)

Replace the `onClick` handler that:
- imports supabase
- calls `supabase.functions.invoke('send-reminder-emails', ...)`
- writes an activity log
- shows a toast

…with a simple handler that opens the existing compose dialog in followup mode:
```ts
setComposeMode('followup');
setComposeOpen(true);
```

Also:
- Remove the now-unused `sendingReminder` state and the `disabled={sendingReminder}` prop.
- Keep the button's location, label ("Send Reminder"), icon (`Mail`), and destructive styling unchanged.
- The existing `<InvoiceComposeDialog>` at the bottom of the page already handles the followup flow (editable subject/body, send via `send-invoice-to-clinic`, activity logging, toast) — no changes needed there.

## Result
Clicking "Send Reminder" in the overdue banner now opens the same editable email composer as "Send follow-up" — consistent behavior, same location the user likes.
