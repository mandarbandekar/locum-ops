## The bug

On Melanie's invoice the "Overtime" row shows **8h** even though she entered **45 min** of overtime. The dollar amount is correct ($150 = 0.75h × $200/hr), so qty is stored correctly — only the **Hours** column is wrong.

### Root cause

Both Hours-column helpers check `shift_id` **before** checking `line_kind === 'overtime'`:

- `src/lib/lineItemHours.ts` → `formatLineHours()` (used by `InvoicePreview` on screen)
- `supabase/functions/generate-invoice-pdf/index.ts` → `lineHoursLabel()` (used by the downloaded PDF)

Overtime lines are linked to the parent shift (`shift_id` is set), so the function returns the **shift's billable hours** (8h) and never reaches the overtime branch. The overtime branch is effectively dead code for shift-linked overtime — which is the normal case.

## Fix

Reorder the checks so `line_kind === 'overtime'` wins over `shift_id`, in both helpers. Also improve the sub-hour formatting so 45 min reads as **"45 min"** instead of "0.8h" (which is what `formatBillableHours(45)` would render).

### Files to change

1. **`src/lib/lineItemHours.ts`** — move the overtime check above the `shift_id` check. When the overtime qty is `< 1` hour, return `"{N} min"` (e.g. `"45 min"`); otherwise return `formatBillableHours(qty*60)` (e.g. `"1.5"`).

2. **`src/components/invoice/InvoicePreview.tsx`** — when the label already contains `"min"`, don't append the `"h"` / `"hrs"` suffix. (Two spots: mobile list line 309, desktop table line 348.)

3. **`supabase/functions/generate-invoice-pdf/index.ts`** — mirror the same fix in `lineHoursLabel()` so the downloaded PDF matches the on-screen preview. Update the column rendering to skip the `"h"` suffix when the label contains `"min"`.

### Out of scope

- No changes to how overtime qty is stored, calculated, or priced — the underlying numbers are correct.
- No changes to the editor panel (already correctly edits overtime in minutes).
- No changes to shift-linked **regular** lines, which should keep showing billable shift hours.

### Verification

- Open Melanie's WAH-2026-005 invoice preview → Overtime row should read **"45 min"** (not "8h"), other rows unchanged at **"8h"**.
- Download the PDF → same result.
- Add a 2-hour overtime line on a test shift → should read **"2h"**.
