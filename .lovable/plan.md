# Founder Dashboard Plan

An admin-only page that lets you (Mandar) see, in 30 seconds, how your beta testers are activating: last login, # clinics, # shifts, # invoices per user — plus 4 hero metrics on top.

## Where it lives

- New route: `/settings/founder`
- New entry in the Settings tab nav (`SettingsNav.tsx`) labeled **"Founder"** with a Crown/Shield icon — only rendered for emails on the admin allowlist (so beta testers don't see it).
- Reachable in 2 clicks: Settings (sidebar) → Founder (tab).

## Admin gating

- Hardcoded allowlist in `src/lib/founderAccess.ts`:
  ```ts
  export const FOUNDER_ADMINS = ['mandar@locum-ops.com']; // edit as needed
  export const isFounderAdmin = (email?: string|null) => !!email && FOUNDER_ADMINS.includes(email.toLowerCase());
  ```
- Used in both `SettingsNav` (hide tab) and `FounderDashboardPage` (show "Not authorized" if not admin). Real auth check still happens server-side via the RPC's RLS / `auth.email()`.

## Backend (one SQL migration)

Create a `SECURITY DEFINER` RPC `get_founder_overview()` that returns one row per user:

```
user_id uuid
email text
display_name text
created_at timestamptz       -- signup
last_sign_in_at timestamptz  -- from auth.users
clinic_count int             -- count(facilities)
shift_count int              -- count(shifts)
invoice_count int            -- count(invoices)
last_activity_at timestamptz -- greatest of created_ats across clinics/shifts/invoices
activation_status text       -- 'active' if last_sign_in_at >= now()-7d, else 'dormant' / 'never'
```

Internal admin check inside the function: `if auth.email() not in (allowlist) then raise exception`. Grant execute to `authenticated`. No new table needed; reads from `auth.users`, `public.facilities`, `public.shifts`, `public.invoices`, `public.profiles`.

## Frontend

**New file:** `src/pages/FounderDashboardPage.tsx`

Single vertically scrolling page (uses existing `SettingsNav` at top so the Settings layout is consistent):

**Section 1 — Header**
- Title: "Founder Dashboard"
- Subtitle: "Beta tester activation — last refreshed {time}"
- Top-right "Refresh" button (re-runs the RPC, updates timestamp)

**Section 2 — Hero metrics (4 cards, grid `md:grid-cols-4`, stack on mobile)**
Computed client-side from RPC rows:
1. **Total testers** — `rows.length`
2. **Active (7d)** — count where `activation_status === 'active'`, percentage below in muted text
3. **Activated** — count where `shift_count >= 1`, percentage
4. **Invoicing** — count where `invoice_count >= 1`, percentage

Uses existing `Card` / `CardHeader` / `CardContent` components and `text-amber-500` for the big number per the semantic-colors memory.

**Section 3 — Per-user table**
Columns: Email · Signed up · Last login · Clinics · Shifts · Invoices · Status pill (Active / Dormant / Never logged in). Sortable by clicking column headers (default: last login desc). Uses existing status-pill styling.

**New files:**
- `src/lib/founderAccess.ts` — admin allowlist helper
- `src/pages/FounderDashboardPage.tsx` — the page
- `supabase/migrations/<ts>_founder_overview.sql` — the RPC

**Modified files:**
- `src/App.tsx` — add `/settings/founder` route
- `src/components/SettingsNav.tsx` — conditionally render "Founder" tab when `isFounderAdmin(user.email)`

## What I'll need from you

Confirm the admin email(s) to allowlist (default: `mandar@locum-ops.com`). After approval I'll implement the migration + page in one pass and you can test by hitting Settings → Founder.
