

## Diagnose & Fix Hourly Shift Invoice Total Bug

### What I found

The invoice you're looking at (`MC-2026-001`, total `$200`) was created from a single shift saved as:

```
rate_kind = flat,  hourly_rate = NULL,  rate_applied = 200
```

…but the shift duration is 8:00 AM – 4:00 PM (8 hours). So the system is correctly multiplying `1 × $200 = $200` — the bug is **upstream**: the shift was saved as a **flat $200 day rate**, not as **$200/hr × 8h**.

There are actually **two related bugs** that together produce this:

---

### Bug 1 — `ShiftFormDialog` defaults custom rates to "flat"

In `src/components/schedule/ShiftFormDialog.tsx` (line 113):

```ts
const [customRateKind, setCustomRateKind] = useState<RateKind>(
  existing?.rate_kind === 'hourly' ? 'hourly' : 'flat'
);
```

When a user clicks **"Custom rate"** and types `200`, the form silently treats it as a **flat day rate**. There is no visible Hourly/Flat toggle in the custom-rate UI in step 3, so a user typing what they mean as "$200/hr" has no way to indicate that. The shift is then saved with `rate_kind=flat, hourly_rate=null, rate_applied=200`, which is exactly what's in the database.

### Bug 2 — `BulkInvoiceDialog` flattens hourly shifts incorrectly

In `src/components/invoice/BulkInvoiceDialog.tsx` (lines 93–100), the line item is built as:

```ts
{ qty: 1, unit_rate: s.rate_applied, line_total: s.rate_applied }
```

For a *correctly saved* hourly shift this gives the right dollar total (because `rate_applied` already stores `hours × hourly_rate`), but the line item renders as `1 × $1,600` instead of `8h × $200/hr`. The auto-generation flow (`buildAutoInvoiceDraft`) does this properly with `qty = regular_hours, unit_rate = hourly_rate`, plus a separate OT line — bulk creation should match.

---

### Fix

**1. `src/components/schedule/ShiftFormDialog.tsx`** — Add a visible Flat / Hourly toggle to the **Custom rate** UI (both guided step 3 and edit form). When Hourly is selected, the saved shift uses `rate_kind=hourly, hourly_rate=<entered>, rate_applied=hours × <entered>`. The live preview chip (already in place for preset hourly rates) will then show the correct total before save.

**2. `src/components/invoice/BulkInvoiceDialog.tsx`** — Replace the single-line construction in `handleCreate` with the same per-shift logic used by `buildAutoInvoiceDraft`:
- **Flat shift** → one line: `qty=1, unit_rate=rate_applied, line_kind='flat'`.
- **Hourly shift** → one regular line (`qty=regular_hours, unit_rate=hourly_rate, line_kind='regular'`) and, if applicable, one overtime line (`qty=overtime_hours, unit_rate=overtime_rate, line_kind='overtime'`).
- Step 3's per-shift price chip should show `${hours}h × ${hourly_rate}/hr = ${rate_applied}` for hourly shifts (today it just shows `$rate_applied`, which is misleading when paired with bug 1).

**3. The existing buggy invoice `MC-2026-001`** is not auto-repairable — the underlying shift's `rate_kind` is wrong, so the invoice is mathematically consistent with the (incorrectly saved) shift. After the fixes above, the user can:
- Edit the shift, switch the rate to **Hourly $200/hr**, save → shift updates to `rate_applied=1600`.
- Delete and recreate the draft invoice (or edit the line item directly in the invoice editor).

No DB migration or schema change is needed.

### Files to change
- `src/components/schedule/ShiftFormDialog.tsx` — add visible Flat/Hourly toggle for custom rates (step 3 + edit form).
- `src/components/invoice/BulkInvoiceDialog.tsx` — split hourly shifts into proper regular (+ optional overtime) line items in `handleCreate`; show per-shift breakdown in step 3.

### Out of scope
- Auto-repairing the existing `MC-2026-001` invoice (data correction, not code).
- Changes to auto-generated drafts (`buildAutoInvoiceDraft` already handles this correctly).
- OT calculation logic (unchanged).

