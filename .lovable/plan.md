# Platform Stabilization Plan — Site Reliability

A focused, multi-layer hardening pass. No feature changes. Goal: fewer "blank UI" incidents, safer error surfaces, clearer signal when something fails, and tighter backend guardrails.

## Findings (current state)

- No global React error boundary — one render exception unmounts the whole app.
- `QueryClient` constructed with defaults — no retry strategy, no `staleTime`, no failure backoff for React Query hooks (credentials, compliance, etc.).
- `process-email-queue` source comment claims `verify_jwt = true` but `supabase/config.toml` sets it to `false` for every function (12 functions). Several should be JWT-verified (`delete-account`, `tax-advisor-chat`, `ai-setup-parse`, `ai-facility-enrich`, `auto-mileage-tracker`, `process-email-queue`, `credential-portal-crypto`, `generate-invoice-pdf`, `calendar-ics-feed`). Truly public ones (`auth-email-hook`, `public-invoice`, `public-confirmation`, `places-autocomplete`) stay open.
- `DataContext.fetchAll` is now fault-tolerant, but a transient auth error still drops the user to a generic error toast with no retry path.
- No client-side runtime error reporting beyond PostHog session replays — runtime issues like the one reported by `praadnyadvm@gmail.com` are diagnosed reactively from logs.
- 27 Supabase linter WARNs (1 permissive RLS + 26 SECURITY DEFINER functions exposed to anon/authenticated). Not blocking, but reducible.
- Auth refresh handling on `getSession` already self-heals stale tokens — keep, but extend to network-level failures.

## Plan

### 1. Frontend resilience

1.1 Add a global `<ErrorBoundary>` wrapping `<AuthGate />` in `App.tsx`.
- Catches render-time exceptions, shows a calm "Something went wrong — Reload" screen with the error logged to console + PostHog (`captureException`).
- Includes a "Reset session and reload" button that signs out locally and reloads (covers stale-state cases).

1.2 Add a route-level boundary inside `<Layout>` so a single page crash doesn't kill the sidebar/nav.

1.3 Configure `QueryClient` with sane defaults:
```ts
defaultOptions: {
  queries: {
    retry: (failureCount, err) => failureCount < 2 && !isAuthError(err),
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  },
  mutations: { retry: 0 },
}
```

1.4 `DataContext.fetchAll` improvements:
- One automatic silent retry per failed loader (300ms backoff) before surfacing the toast.
- Replace blocking toast with a non-blocking inline banner ("Some data couldn't load — Retry") + Retry button that re-runs only the failed loaders.
- Track `lastFailedTables` in state so the banner persists until resolved.

1.5 Auth resilience: in `AuthContext`, catch `onAuthStateChange` errors and downgrade to a clean local sign-out instead of a hung loading state.

### 2. Backend hardening

2.1 Fix `supabase/config.toml` JWT verification per function:
- `verify_jwt = true`: `delete-account`, `tax-advisor-chat`, `ai-setup-parse`, `ai-facility-enrich`, `auto-mileage-tracker`, `backfill-mileage`, `business-summary`, `generate-auto-invoices`, `generate-invoice-pdf`, `generate-recurring-expenses`, `google-calendar-auth`, `send-invoice-to-clinic`, `send-reminder-emails`, `process-email-queue` (called by pg_cron with service-role JWT), `credential-portal-crypto`.
- `verify_jwt = false`: `auth-email-hook`, `public-invoice`, `public-confirmation`, `places-autocomplete`, `calendar-ics-feed` (token-authenticated).
- Update `process-email-queue/index.ts` comment to reflect actual final value.

2.2 Add migration: revoke `EXECUTE` on `public` from `anon`/`authenticated` for SECURITY DEFINER helpers that should never be called over PostgREST (e.g. `move_to_dlq`, `read_email_batch`, `delete_email`, `enqueue_email`, `handle_new_user`, `handle_new_user_profile`, `update_updated_at`, `get_founder_overview` — already gated internally but lock down the API surface).
- Keeps `has_role`-style helpers callable where intentionally used.

2.3 Tighten the one permissive RLS policy flagged by the linter (review and replace `WITH CHECK (true)` on whichever non-SELECT policy is flagged). Concrete table identified during execution.

### 3. Observability

3.1 Add `errorReporting.ts`: a thin wrapper that posts caught exceptions to PostHog `posthog.captureException` plus a typed console group, used by the error boundaries and `DataContext` failures.

3.2 Add structured logging tags to all edge functions: every `console.error` includes `{ fn, user_id?, request_id }` so log queries can pivot per-function and per-user. Lightweight helper added to `supabase/functions/_shared/log.ts` and adopted in the 5 most-used functions (`process-email-queue`, `generate-invoice-pdf`, `auto-mileage-tracker`, `send-reminder-emails`, `auth-email-hook`).

3.3 Add a 1-minute health probe edge function `health` (public, returns `{ ok, db, version }`) for external uptime monitoring. Unblocks future status-page work without redesign.

### 4. Tests

4.1 Vitest unit test for `DataContext.fetchAll` retry/banner behavior using mocked Supabase responses.
4.2 Unit test for the new error boundary fallback (renders fallback on thrown child, recovers on reset).

## What this will NOT do

- No schema changes to user-facing tables.
- No UX redesign — banner + boundary fallbacks match existing `style/visual-identity` (flat, calm, themed borders).
- No pricing/compute upgrades — those remain a user-driven decision in Cloud settings if load grows.

## Files touched

- `src/App.tsx` — ErrorBoundary wrap, QueryClient config.
- `src/components/ErrorBoundary.tsx` (new), `src/lib/errorReporting.ts` (new).
- `src/components/Layout.tsx` — route-level boundary.
- `src/contexts/DataContext.tsx` — retry + inline banner, expose `retryFailedLoaders`.
- `src/contexts/AuthContext.tsx` — auth listener hardening.
- `supabase/config.toml` — per-function `verify_jwt`.
- `supabase/functions/process-email-queue/index.ts` — comment fix.
- `supabase/functions/_shared/log.ts` (new) + adoption in 5 functions.
- `supabase/functions/health/index.ts` (new).
- New migration: revoke EXECUTE on internal SECURITY DEFINER helpers + tighten one permissive policy.
- `src/test/errorBoundary.test.tsx`, `src/test/dataContextRetry.test.ts` (new).

## Risks / mitigations

- Flipping `verify_jwt` to true on functions called only from the app is safe (Supabase JS auto-attaches the user JWT). pg_cron jobs already pass `Authorization: Bearer <service_role>`, which Supabase's gateway accepts under `verify_jwt = true`.
- Revoking EXECUTE on internal helpers: each one is verified to only be called via triggers / other definer functions / service role, never from the client.
- ErrorBoundary catches render errors but not async ones — async paths covered by existing toast + new structured logging.

Approve to proceed and I'll implement in this order: config.toml + migration → ErrorBoundary + QueryClient → DataContext retry banner → logging helpers + health probe → tests.