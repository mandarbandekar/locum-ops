# Fix Praadnya's misanchored shift

## Scope

One affected shift only (confirmed via diagnostic):

- User: `praadnyadvm@gmail.com`
- Facility: Acacia Pet Clinic San Jose (`America/Los_Angeles`)
- Shift id: `d5613401-0e62-40b3-b500-4c07f97e2385`
- Currently stored: `start 2026-05-27T06:00:00Z` → renders **May 26, 11:00 PM PDT**
- Intended: **May 27, 8:00 AM – 5:00 PM PDT** → `start 2026-05-27T15:00:00Z`, `end 2026-05-28T00:00:00Z`
- Correction: **+9 hours** (Italy CEST → LA PDT offset on that date)

`kurtz.214@gmail.com`'s 5 shifts are **excluded** — pattern is ambiguous and needs user confirmation before touching.

## Step 1 — Data fix (one-time `UPDATE`)

Run via the insert tool (data change, not schema):

```sql
UPDATE public.shifts
SET
  start_datetime = start_datetime + INTERVAL '9 hours',
  end_datetime   = end_datetime   + INTERVAL '9 hours',
  updated_at     = now()
WHERE id = 'd5613401-0e62-40b3-b500-4c07f97e2385'
  AND user_id = '302869ed-...'  -- praadnya, double-guard
  AND start_datetime = '2026-05-27T06:00:00+00';  -- triple-guard: no-op if already fixed
```

The three guards (`id`, `user_id`, exact current `start_datetime`) make the statement idempotent — re-running it does nothing.

## Step 2 — Verification

Immediately after the update, run a read query to confirm:

```sql
SELECT id,
       start_datetime,
       end_datetime,
       to_char(start_datetime AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD HH24:MI') AS clinic_local_start,
       to_char(end_datetime   AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD HH24:MI') AS clinic_local_end
FROM public.shifts
WHERE id = 'd5613401-0e62-40b3-b500-4c07f97e2385';
```

Expected output:
- `clinic_local_start` = `2026-05-27 08:00`
- `clinic_local_end`   = `2026-05-27 17:00`

## Step 3 — Calendar rendering check

Visit `/schedule` for Praadnya (or impersonate via the user's own session). The shift chip should:

- Appear on the **May 27** column (not May 26).
- Span **8 AM – 5 PM** in the time grid.
- Display the same hours regardless of whether the browser is in Italy (CEST) or PDT — because `WeekTimeGrid.tsx` reads the instant through `tzForFacility()` → `America/Los_Angeles`.

No code changes needed — the form-side fix from the previous turn already prevents recurrence; this is purely a data correction.

## Out of scope

- Kurtz's 5 shifts (need user outreach first).
- Any in-app self-serve banner (user chose "diagnostic list only").
