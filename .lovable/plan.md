## Diagnosis: Overnight shifts show "0h"

### What's happening
On the Schedule, any shift where `end_datetime` is on the **same calendar day** as `start_datetime` but with a clock time **before** the start (e.g. 11pm → 7am stored as `2026-08-09 23:00` → `2026-08-09 07:00`) renders as `0h`.

The Schedule reads hours two ways, and both fail on a negative duration:
- **List view** (`SchedulePage.tsx:507`) — `getBillableMinutes(s) / 60`. `getBillableMinutes` clamps negatives to `0` via `Math.max(0, …)` → shows `0h`, and any hourly-rate total recomputed from this is also `$0`.
- **Month/week cell** (`SchedulePage.tsx:314`) — `Math.max(0, differenceInHours(end, start))` → also `0h`.

So the display code is doing the right defensive thing — the underlying data is wrong.

### Confirmed in the database
A query against `shifts` found **24 broken records across 1 user** where `end_datetime ≤ start_datetime` (all 11pm→11am same-day, intended as 12h overnights). Example rows:

```text
start_datetime          end_datetime            stored hours
2026-08-09 23:00:00+00  2026-08-09 11:00:00+00  -12
2026-04-28 00:00:00+00  2026-04-27 12:00:00+00  -12   (end is BEFORE start by a full day)
```

### Why the data is broken
The current `ShiftFormDialog` correctly rolls the end to the next day when end ≤ start (`buildStartEndIso`, line 341), and `useManualSetup.addShift` does the same. But there are write paths that do **not** roll forward:

1. **AI setup import** (`src/hooks/useSetupAssistant.ts:280-288`) writes `start_datetime: d.start_time`, `end_datetime: d.end_time` straight from the AI parser output with no overnight handling. If the LLM returns same-day timestamps for an overnight, we persist `end < start`.
2. Historical shifts created before `buildStartEndIso` was added may also have leaked through.
3. The two April rows in the sample (`end_datetime` literally a day BEFORE start) suggest a separate timezone-related bug in some import path — possibly an early version that subtracted instead of added the overnight day.

There are no DB-level guards (no CHECK / trigger) preventing `end_datetime ≤ start_datetime`.

## Fix plan

### 1. Backfill the broken rows (one-time migration)
Run a SQL migration that, for every shift with `end_datetime ≤ start_datetime`, adds 24 hours to `end_datetime` until it's after `start_datetime` (handles both the −12h same-day rows and the −36h cross-day rows):

```sql
UPDATE public.shifts
SET end_datetime = end_datetime + interval '1 day'
WHERE end_datetime <= start_datetime;

UPDATE public.shifts
SET end_datetime = end_datetime + interval '1 day'
WHERE end_datetime <= start_datetime;  -- catches the −36h rows
```

Verify post-migration that no rows remain with `end_datetime ≤ start_datetime`.

### 2. Add a DB guard so this can never recur
Add a validation **trigger** (per memory rules — not a CHECK constraint) on `public.shifts` that raises if `end_datetime <= start_datetime` on insert/update.

### 3. Patch the AI-setup write path
In `src/hooks/useSetupAssistant.ts` (`saveConfirmedEntities`, ~line 280), after computing start/end ISO, roll `end` forward by 24h while `end <= start`. Mirror the logic already in `buildStartEndIso` / `useManualSetup`.

### 4. Defensive display fallback
In `SchedulePage.tsx` list view and month cell, if `end <= start` after parse, treat as overnight (`end + 24h`) for the displayed hours. This prevents legacy records from showing 0h even if the backfill is delayed, and protects against any future write path we missed.

### 5. Sanity-check sibling consumers
Quick audit of the same `end_datetime - start_datetime` math in: `WeekTimeGrid.tsx` (height calc uses wall-clock hours and will render 0-height for overnights regardless — separate visual issue worth flagging), `lib/shiftBreak.ts`, `lib/businessLogic.ts` (conflict detection uses minutes-since-midnight per local day, also breaks for overnights), invoice generation, ICS feed. Surface findings; fix if cheap, ticket if not.

### Out of scope for this fix
- The week-grid visual rendering of true overnight shifts spanning two days (separate UX work).
- Reworking `detectShiftConflicts` to understand cross-midnight overlap.

### Files to touch
- New SQL migration (backfill + validation trigger)
- `src/hooks/useSetupAssistant.ts`
- `src/pages/SchedulePage.tsx`
- (audit-only first pass) `src/components/schedule/WeekTimeGrid.tsx`, `src/lib/businessLogic.ts`
