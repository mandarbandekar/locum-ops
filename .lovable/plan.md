# Fix timezone bugs across the app

The shift calendar machinery is already tz-aware, but a second tier of features parses date-only strings as UTC midnight or formats UTC instants in browser-local time. Users in Pacific/Mountain/Central time see wrong dates on credentials, invoices, mileage, confirmations, and clinic-facing pages.

## Tier 1 — Data correctness (do first)

1. **Credential expiration math** — `src/lib/credentialTypes.ts` `getDaysUntilExpiration` and friends. Switch to a shared `parseDateOnly(ymd)` helper that constructs a local-midnight Date from `YYYY-MM-DD`. Fix the date-only `format(new Date(expiration_date), …)` calls in `CredentialsList.tsx`, `CredentialsOverview.tsx`, `RenewalsTab.tsx`.

2. **Invoice overdue logic** — `src/lib/invoiceHelpers.ts` `isInvoiceOverdue` uses `new Date(due_date)`. Switch to `parseDateOnly`. This fixes the overdue badge, reminder triggers, and dashboard attention cards. Also fix display formatting in `InvoiceDetailPage.tsx`, `InvoiceEditPanel.tsx`, `InvoiceActionBar.tsx`.

3. **Confirmation month bucketing** — `src/hooks/useConfirmations.ts` and `src/hooks/useClinicConfirmations.ts` compare UTC instants against browser-local month bounds. Switch to comparing `formatYMDInTz(shift.start_datetime, clinicTz)` against the target month's `YYYY-MM` prefix so overnight Pacific shifts stay in the right month.

4. **Mileage `expense_date`** — `supabase/functions/backfill-mileage/index.ts` and `auto-mileage-tracker/index.ts` use `start_datetime.split("T")[0]` (UTC date). Switch to clinic-tz wall date using the existing `_shared/tzTime.ts` helper.

## Tier 2 — Display in clinic timezone

5. **FacilityDetailPage shift history** — `src/pages/FacilityDetailPage.tsx:684,687`. Use `formatDateInTz`/`formatTimeInTz` with the resolved shift tz.

6. **PublicConfirmationPage** (clinic-facing) — `src/pages/PublicConfirmationPage.tsx:119-122`. Same fix. This is the externally sent confirmation doc, so highest visibility.

7. **ConfirmationsPanel, ConfirmationDetailDrawer, ClinicConfirmationsTab** — replace `format(new Date(s.start_datetime), 'EEE, MMM d')` with the tz-aware equivalent so date and time labels are consistent.

8. **BlockTimeDialog edit pre-fill** — `src/components/schedule/BlockTimeDialog.tsx:60-61`. Use `formatHHMMInTz` so editing a block doesn't shift its times.

## Tier 3 — Edge timing and dashboard

9. **Recurring expenses "today"** — `supabase/functions/generate-recurring-expenses/index.ts:20`. Use the user's profile tz (already on `user_profiles.timezone`) instead of UTC midnight to decide what "today" means.

10. **Auto-invoice year stamp** — `supabase/functions/generate-auto-invoices/index.ts:421`. Derive year from the billing period's facility-tz wall date, not server UTC.

11. **Dashboard "today / this week"** — `src/pages/DashboardPage.tsx:749,756`. Use profile tz for the "today" check on shifts.

## Out of scope (low severity, defer)

- Quarterly earnings, tax payment quarter bucketing, contracts display, Reports page ranges, "today" highlight ring on the calendar. These are cosmetic or rarely cross a boundary; leave for a follow-up.

## Approach

- Add one shared helper `parseDateOnly(ymd: string): Date` in `src/lib/tzTime.ts` (and mirror in `supabase/functions/_shared/tzTime.ts`) so we have a single safe way to parse date-only columns.
- Add `clinicWallDateFromUtc(iso, tz)` in `_shared/tzTime.ts` for the edge functions.
- Reuse existing `formatYMDInTz`, `formatDateInTz`, `formatTimeInTz`, `resolveShiftTz`, `resolveProfileTz` everywhere else.

## Verification

- Run existing vitest suite (`tzTime.test.ts`, `timezoneHardening.test.ts`, `timezoneRegression.test.ts`, `shiftFormTz.test.ts`, `invoiceOverdue.test.ts`, `confirmations.test.ts`, `clinicConfirmations.test.ts`).
- Add new unit tests for `getDaysUntilExpiration`, `isInvoiceOverdue`, and `useConfirmations` month bucketing using a Pacific tz and a late-night overnight shift.
- Run Deno tests for `backfill-mileage` and `auto-mileage-tracker` edge functions.

## Suggested split

Each tier can ship independently. Recommend tackling Tier 1 first (correctness), then Tier 2 (clinic-facing display), then Tier 3. Want me to start with all of Tier 1 in one pass, or one feature at a time?
