# Migration: Roll out Shift Types to existing users

Goal: turn a silently-launched feature into one existing users can adopt with two clicks — without ever rewriting their rate card or shift records behind their back.

## Strategy (recap)

- **Additive only.** `shift_type` stays nullable everywhere. Code already handles `null`.
- **Two surfaces nudge users:**
  1. A one-time **Dashboard banner** for users who have shifts but no rates with shift types.
  2. A **Rate Card banner** that appears whenever any active rate is missing a shift type.
- **Backfill is opt-in**, runs in an Edge Function, and only writes when we have high confidence (exact rate-name match against the user's Rate Card or the facility's `custom_rates`).
- **Inference is deterministic** (name keywords → slug). No AI for v1.

---

## What we're building

### 1. Inference helper — `src/lib/shiftTypeInference.ts`
Single function `inferShiftTypeFromName(name: string): string | undefined` using a keyword table:

```text
"er" / "emergency"        → er
"surgery" / "surg"        → surgery
"dental"                  → dental
"wellness" / "vaccine"    → wellness
"on-call" / "oncall"      → oncall
"telemed" / "telehealth"  → telemed
"specialty" / "referral"  → specialty
"shelter" / "nonprofit"   → shelter
"gp" / "general"          → gp
```
Match is whole-word, case-insensitive. Anything else → `undefined` (no guess).

### 2. Rate Card review banner (`SettingsRateCardPage.tsx`)
- Shows above the rate sections when any active rate is missing `shift_type`.
- Copy: "Tag your rates by shift type so we can categorize new shifts automatically. We've suggested types for some — review and save."
- "Suggest types" button runs `inferShiftTypeFromName` against every untagged rate and patches them locally (user still has to review + Save).
- After Save, if there are existing untyped shifts, an inline confirmation appears: "Apply these shift types to past shifts too?" → calls the backfill function.

### 3. Dashboard one-time banner — `src/components/dashboard/ShiftTypeMigrationBanner.tsx`
- Visibility rules:
  - User has ≥1 shift AND ≥1 of those shifts has `shift_type IS NULL`
  - `profile.dismissed_prompts.shift_type_migration` is not true
  - Not in demo mode
- Two actions: **"Set up shift types"** → `/settings/rate-card`, **"Dismiss"** → sets the flag.
- Mounted in `DashboardPage.tsx` near the existing welcome / getting-started banners.

### 4. Backfill Edge Function — `supabase/functions/backfill-shift-types/index.ts`
- Authenticated (`getClaims`); operates on the caller's `user_id` only.
- Loads: caller's `default_rates`, all `terms_snapshots` for their facilities, all their shifts where `shift_type IS NULL`.
- For each untyped shift, in order:
  1. Find the matching facility's `terms_snapshots.custom_rates[]` entry by `amount + kind` (and label fuzzy-match). If that entry has `shift_type`, use it.
  2. Otherwise look up the predefined rates (`weekday_rate`, `weekend_rate`, …) by amount; map keys → slugs (`weekday/weekend → undefined unless rate name suggests`, `telemedicine_rate → telemed`).
  3. Otherwise match against `default_rates` by `amount + basis` (where `basis` derived from `rate_kind`).
  4. Otherwise run `inferShiftTypeFromName` on the rate name we recovered.
- Writes only when a slug was resolved. Returns counts: `{ scanned, updated, skipped }`.
- Idempotent — re-running only touches still-NULL shifts.

### 5. Migration — index for efficient lookups
```sql
CREATE INDEX IF NOT EXISTS idx_shifts_user_untyped
  ON public.shifts (user_id)
  WHERE shift_type IS NULL;
```
No data writes; safe to run anytime.

### 6. Profile flag
Reuse `dismissed_prompts.shift_type_migration: boolean`. No schema change needed.

---

## Files

### New
- `src/lib/shiftTypeInference.ts`
- `src/components/dashboard/ShiftTypeMigrationBanner.tsx`
- `supabase/functions/backfill-shift-types/index.ts`
- `supabase/migrations/<timestamp>_shift_type_backfill_index.sql`

### Edited
- `src/pages/SettingsRateCardPage.tsx` — review banner + "Suggest types" + post-save backfill prompt.
- `src/pages/DashboardPage.tsx` — mount `ShiftTypeMigrationBanner`.

---

## Rollout order

1. Ship migration + inference lib + both banners + edge function in one PR. All additive; nothing breaks for users who ignore it.
2. Watch over 30 days: % of users who clicked into Rate Card, % of shifts now typed.
3. If adoption stalls, follow up with a single email nudge from the existing reminders engine. We will not auto-apply types without a click.

## Why no auto-backfill on deploy

Two reasons:
- Names like "Weekday Rate" are ambiguous (could be GP, ER, or Wellness depending on the user). Inferring silently would mis-tag shifts that then flow into invoice descriptions.
- Users should see *what* changed before it lands on past invoices. The Rate Card review screen + explicit "Apply to past shifts" button gives them that control.

Ready to implement on approval.
