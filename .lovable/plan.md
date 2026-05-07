# YTD Mileage Starting Balance

## Goal
Let users enter miles they've already tracked elsewhere this year so the Mileage tab's YTD totals start from that number instead of zero — without polluting the confirmed mileage log with fake entries.

## Recommended approach: a single "starting balance" on `expense_config`
The `expense_config` table is already per-user and per-tax-year. Add two fields there and surface them in the Mileage tab. This is the most efficient option — no new table, no fake expense rows, one place to edit.

```text
expense_config (existing, per user + tax_year)
 ├─ irs_mileage_rate_cents
 ├─ home_office_rate_cents
 + ytd_starting_miles            numeric   default 0
 + ytd_starting_miles_note       text      default ''   (e.g. "From MileIQ Jan–Apr")
```

The starting balance is pure additive metadata — it never creates expense rows, so it can't accidentally double-count, can't break per-clinic breakdowns, and clears automatically when the tax year rolls over.

## UX

On the Mileage tab, in the existing **Setup Status** card (or right next to the YTD stats strip):

- New row: *"Starting balance: 1,240 mi imported · Edit"*
- "Edit" opens a small dialog:
  - Number field: **Miles already tracked this year** (required, ≥ 0)
  - Text field: **Source / note** (optional, e.g. "MileIQ Jan–Apr 2026")
  - Helper copy: "We'll add this to your YTD totals. It won't appear in your confirmed mileage log or per-clinic breakdown."
  - Buttons: Save / Clear / Cancel

In the **YTD Stats Strip**:
- `YTD Miles` = `ytd_starting_miles + Σ confirmed mileage this year`
- `YTD Deduction` = `(ytd_starting_miles × IRS rate) + Σ confirmed deduction this year`
- Tooltip on YTD Miles updated to mention "includes 1,240 mi imported starting balance" when > 0.

`This Month` stays unchanged — it only reflects entries actually logged in the app, so the starting balance doesn't distort current-month tracking.

## Where it flows through
The same `ytdMileageMiles` / `ytdMileageDeductionCents` are also consumed by:
- **CPA Prep → MileageSummary** (`src/components/cpa-prep/MileageSummary.tsx`)
- **Tax projection / write-off summary**

Because we change the values at the `useExpenses` hook level, all downstream surfaces pick it up automatically. The "Miles by Clinic" list in CPA Prep stays accurate (it only shows clinics with real entries) — we'll add a small footer line "+ 1,240 mi starting balance (not attributed to a clinic)" when applicable.

## Technical details

1. **Migration** — add two columns to `expense_config`:
   - `ytd_starting_miles numeric NOT NULL DEFAULT 0`
   - `ytd_starting_miles_note text NOT NULL DEFAULT ''`
   No RLS changes needed (existing policy already covers the row).

2. **Hook (`src/hooks/useExpenses.ts`)**
   - Read the two new fields into `config`.
   - Update `ytdMileageMiles` and `ytdMileageDeductionCents` to add `config.ytd_starting_miles` and `config.ytd_starting_miles * config.irs_mileage_rate_cents`.
   - Expose an `updateMileageStartingBalance(miles, note)` mutator (handles demo mode + Supabase update, same pattern as existing config mutators).

3. **UI**
   - New `MileageStartingBalanceDialog` component.
   - Add an "Edit starting balance" affordance in `MileageTrackerTab.tsx` and show the imported amount when > 0.
   - Update the YTD Miles tooltip to disclose the imported portion.

4. **CPA Prep** — small footer note in `MileageSummary.tsx` when starting balance > 0.

## Why not the alternatives
- **One synthetic "starting balance" expense row**: would show up in the confirmed log, the per-clinic breakdown (un-attributed), and CPA exports as a real entry — confusing and easy to double-count.
- **Per-month manual entries**: more flexible but heavier UX; users who already tracked elsewhere just want one number, not 12.

If you'd rather have the starting balance broken down per clinic (so it flows into Income/Clinic scorecards), say the word and I'll switch the plan to a lightweight `mileage_starting_balances` table keyed by clinic.
