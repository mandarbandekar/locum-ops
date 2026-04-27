## What happened to praadnyadvm@gmail.com's clinics

**No data was lost.** All 11 facilities, 112 shifts, 83 invoices, and 63 expenses are still in the database under her account, untouched since Apr 15. This was a **client-side rendering failure**, not a data deletion.

### Root cause

`src/contexts/DataContext.tsx` → `fetchAll()` runs 12 table queries in a single `Promise.all(...)`. If **any one** query rejects (transient network blip, a 401 during a token refresh, a 5xx on one table), the entire `try` block jumps to `catch`, and **none** of the `setFacilities / setShifts / setInvoices / ...` calls run. The UI stays stuck on the initial empty arrays — making it look like every clinic vanished.

The auth logs around her login (14:29:26 token_revoked → 14:29:37 logout → 14:29:42 login) are consistent with the kind of token churn that can cause a single parallel request to fail.

A page refresh would have restored her view (worth confirming with her).

### Fix

Make `fetchAll()` fault-tolerant so one failed query no longer blanks the whole app.

1. **Switch from `Promise.all` to `Promise.allSettled`** in `fetchAll()`.
2. For each setter, only update state when that specific query **succeeded**. On failure, keep the previous state (don't blank it) and log the table name + error.
3. Show a single non-blocking toast like "Some data failed to load — try refreshing" only if one or more queries failed, instead of the current "Failed to load data" that fires when *any* fails.
4. Add a structured `console.error` per failed table (`[fetchAll] facilities failed: ...`) so we can diagnose future incidents from console logs / session replay.
5. Keep `setDataLoading(false)` in `finally` (unchanged).

### Optional follow-ups (small, same file)

- Add a one-shot retry (single re-attempt after 1.5s) for any individually failed table before falling back to "keep previous state."
- When `fetchAll` is called on initial mount and *facilities specifically* fails, surface a visible inline retry button on `FacilitiesPage` instead of an empty grid, so users aren't left thinking their data is gone.

### Files touched

- `src/contexts/DataContext.tsx` — only the `fetchAll` function body and the `toast.error` line.

### What I'll tell the user (suggested message to praadnyadvm@gmail.com)

"Your clinics are safe — all 11 are still on your account. What you saw was a temporary loading glitch on our side, not a deletion. A page refresh should have brought everything back. We're shipping a fix so a single failed background request can't blank the screen again."

No DB migration, no schema change, no destructive operations.