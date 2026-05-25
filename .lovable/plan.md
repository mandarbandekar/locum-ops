## Scope

Per your recommendation, ship **Phases 1–4** in this pass (the ones that affect billing and reminders). Phases 5–7 (ICS, facility-tz edit confirm, profile auto-sync prompt) are queued for a follow-up so this PR stays reviewable and reversible.

If you'd rather I do all 7 in one pass, say so and I'll expand.

---

## Phase 1 — Data & fallback cleanup

**Migration**
- Backfill `facilities.timezone` where NULL/empty: prefer the owning user's `user_profiles.timezone`, else `'America/New_York'`.
- `ALTER TABLE facilities ALTER COLUMN timezone SET NOT NULL` and `SET DEFAULT 'America/New_York'`.

**New shared helper** — `src/lib/resolveTimezone.ts`
- `resolveShiftTz(shift, facility, profile)` → snapshot → facility → profile → `'America/New_York'`, with `console.warn` when falling through past facility.
- Replace remaining `'America/Los_Angeles'` literal fallbacks in render/invoice/confirmation paths.

**Facility creation normalization**
- `useManualSetup.addFacility`: seed `timezone` from `profile?.timezone ?? deviceTz ?? 'America/New_York'` (matches `AddClinicStepper`).

## Phase 2 — Shift timezone snapshot

**Migration**
- `ALTER TABLE shifts ADD COLUMN timezone_at_creation text`.
- Backfill: `UPDATE shifts SET timezone_at_creation = f.timezone FROM facilities f WHERE shifts.facility_id = f.id`.
- (Leave nullable so old paths don't break; new inserts always set it.)

**Code**
- `useManualSetup.addShift` and `ShiftFormDialog` save path: write `timezone_at_creation` = the tz used for `zonedWallClockToUtc`.
- All display / invoice / confirmation reads switch to `resolveShiftTz()` (which prefers snapshot).

## Phase 3 — Invoice period math

`supabase/functions/generate-auto-invoices/index.ts`
- For each facility's period, compute `periodStartUtc = zonedWallClockToUtc(periodStart, '00:00', facility.timezone)` and `periodEndUtc = zonedWallClockToUtc(nextDayAfterPeriodEnd, '00:00', facility.timezone)`.
- Query shifts with `start_datetime >= periodStartUtc AND start_datetime < periodEndUtc`.
- Remove the UTC-overlap tolerance hack.
- Port `zonedWallClockToUtc` into a Deno-safe helper inside the function (or shared `_shared/tzTime.ts`).

## Phase 4 — Reminder windows

`supabase/functions/send-reminder-emails/index.ts`
- Shift-specific "tomorrow's shift": derive today/tomorrow window using shift's `timezone_at_creation || facility.timezone`.
- Dashboard/digest "today": use recipient `user_profiles.timezone`.
- Same Deno tz helper as Phase 3.

## Tests added (`src/test/`)

- `timezoneHardening.test.ts` — covers your 8 scenarios:
  1. Italy user → 8 AM California shift renders 8 AM Pacific
  2. AZ clinic / CA user → AZ time displayed
  3. Overnight 8 PM–6 AM duration + roll
  4. May 31 11 PM Pacific shift → May invoice period (not June)
  5. DST spring-forward day → period boundary + display correct
  6. Reminder "today/tomorrow" derived from facility tz at 11 PM Pacific (UTC = next day)
  7. Editing `facilities.timezone` doesn't move shifts that have `timezone_at_creation` set
  8. Snapshot consistency: shift with snapshot 'America/Chicago' displays Chicago even if facility flips to 'America/New_York'

Edge-function logic extracted into a pure helper (`periodBoundsUtc(facilityTz, periodStart, periodEnd)`, `isShiftOnLocalDay(...)`) so we can unit-test it in vitest without spinning up Deno.

## Explicitly NOT in this pass

- Phase 5 (ICS `VTIMEZONE` / `TZID`)
- Phase 6 (facility-tz change confirm dialog)
- Phase 7 (profile auto-sync prompt — current silent auto-sync stays)
- No `local_date` / `local_start_time` columns
- No changes to add/edit shift UI
- No advanced travel mode

## File touch list (estimate)

- new: `supabase/migrations/<ts>_timezone_hardening.sql`
- new: `src/lib/resolveTimezone.ts`
- new: `src/lib/invoicePeriodTz.ts` (pure helpers shared with edge fn logic)
- new: `src/test/timezoneHardening.test.ts`
- edit: `src/hooks/useManualSetup.ts`
- edit: `src/components/schedule/ShiftFormDialog.tsx`
- edit: `supabase/functions/generate-auto-invoices/index.ts`
- edit: `supabase/functions/send-reminder-emails/index.ts`
- edit: callers using `'America/Los_Angeles'` literal fallback (audit + replace)
- edit: `src/integrations/supabase/types.ts` is auto-regenerated after migration

## Migration approval

Phases 1 + 2 require a database migration (`facilities.timezone` NOT NULL + backfill, `shifts.timezone_at_creation` add + backfill). I'll submit it via the migration tool and wait for your approval before touching code that depends on the new column.

---

Confirm and I'll start with the migration, then Phase 1 helpers, then Phases 2–4 in order.