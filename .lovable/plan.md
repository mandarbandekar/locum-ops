# Remove "Tag past shifts" backfill prompt

The post-save banner on Settings → Rate Card that asks "Apply these shift types to past shifts?" will be removed. Old shifts stay exactly as they are — no retroactive tagging. Saving the Rate Card will only affect new/future behavior.

## Changes

**`src/pages/SettingsRateCardPage.tsx`**
- Remove the backfill banner JSX (the "Apply these shift types to past shifts?" block with `Tag N past shifts` / `Not now` buttons).
- Remove `backfillOpen` / `backfillRunning` state and the `runBackfill()` handler (which invoked the `backfill-shift-types` edge function).
- Remove the post-save trigger inside `handleSave` that opened the banner when untyped past shifts existed.
- Remove the now-unused `untypedShiftCount` memo, the `shifts` destructure from `useData`, and the unused `supabase` import.
- Keep the "Tag your rates by shift type" review banner above it — that targets rate definitions, not past shifts, and is unrelated.

**Edge function (optional cleanup)**
- The `supabase/functions/backfill-shift-types` function will no longer be called from the UI. Leave it deployed (harmless, no cron) so previously generated data is unaffected. No deletion needed.

## Result

- Rate Card save flow: validate → save → toast "Rate Card saved". Done.
- Past shifts retain their existing `shift_type` (or lack thereof) — exactly as generated before.
