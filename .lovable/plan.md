## Fix founder dashboard "last activity" recency

**Problem:** `get_founder_overview()` computes `last_activity_at` as the GREATEST of facility/shift/invoice `created_at` plus `auth.users.last_sign_in_at`. That misses two real signals:

1. `user_sign_in_events.created_at` — our own per-session log (Kimberly has May 26 here, but `auth.users.last_sign_in_at` is stuck on Apr 27 because Supabase only bumps it on fresh password sign-ins, not refresh-token sessions).
2. `invoice_pdf_downloads.last_downloaded_at` — proves the user actually used the app (Kimberly downloaded May 26).

Result: active users like Kimberly look dormant on the founder dashboard.

## Change

Migration that replaces `public.get_founder_overview()` with an updated version that:

- Adds a CTE `signin_event_stats` selecting `MAX(created_at)` per user from `user_sign_in_events`.
- Adds a CTE `download_event_stats` selecting `MAX(last_downloaded_at)` per user from `invoice_pdf_downloads` (and keeps the existing download_count sum).
- Extends the `last_activity_at` GREATEST() to include those two new timestamps alongside the existing facility/shift/invoice `created_at` and `auth.users.last_sign_in_at`.
- Also folds `invoices.updated_at` and `shifts.updated_at` into the GREATEST so edits register as activity (currently only `created_at` does).
- Updates `activation_status`: if `last_activity_at` is within 14 days → `active`; older → `dormant`; never signed in → `never`. (Today it's just `never` vs `active`, which isn't useful.)

No table schema changes, no frontend code changes — the founder dashboard already reads `last_activity_at` and `activation_status` from this function, so it will just start showing accurate values.

## Verification

After migration:
- Re-query `get_founder_overview()` for Kimberly and confirm `last_activity_at` = May 26, 2026 (not Apr 27).
- Spot-check a few other users to make sure no one regresses.