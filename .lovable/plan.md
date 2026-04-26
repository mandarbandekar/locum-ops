## Diagnosis

The password reset flow is broken because the recovery link in the email **does not actually land users on `/reset-password`** — it lands them on the app root (`/`), where the recovery session is silently consumed and the user ends up either on the dashboard or, if they manually navigate to `/reset-password`, on the "Please use the link from your email" fallback screen.

### Step-by-step trace of what happens today

1. User clicks **Forgot Password** → `ForgotPasswordPage.tsx` calls:
   ```ts
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/reset-password`,
   })
   ```
   So the *intended* landing URL is correct.

2. Supabase generates a recovery link of the form:
   ```
   https://<project>.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://app.locum-ops.com/reset-password
   ```
   This URL is passed to our `auth-email-hook` edge function as `payload.data.url`, and we render it into the email's "Reset Password" button verbatim. ✅ Email is fine.

3. User clicks the button. Supabase verifies the token server-side. But here's the problem: Supabase's verify endpoint **only honors `redirect_to` when the URL is in the project's allowed Redirect URLs list**. If `https://app.locum-ops.com/reset-password` (and the preview/lovable.app variants) are not whitelisted, Supabase falls back to the configured **Site URL**, which is currently the app root.

4. Even if `/reset-password` *is* whitelisted on the published domain, the link delivered to the user (screenshot shows `app.locum-ops.com`) is going through the same path, and based on the user reports the redirect lands at `/`, not `/reset-password`.

5. Either way, when the user lands at `/` with `#access_token=...&type=recovery` in the hash:
   - `AuthContext` immediately picks up the session and marks them signed-in.
   - `AuthenticatedApp` renders the dashboard (or onboarding/welcome).
   - `ResetPasswordPage` never mounts, so its `type=recovery` hash detector never runs.
   - The recovery hash is silently consumed by Supabase's session handling.

6. If the user then manually navigates to `/reset-password`, the hash is gone, `isRecovery` stays `false`, and they see the "Please use the link from your email to access it" message — exactly the screenshot they shared.

### Why the previous "fix" didn't work

The previous change added the `/reset-password` route inside `AuthenticatedApp`. That makes the route reachable when signed in, but does nothing about the fact that **the recovery link doesn't navigate there in the first place** — it lands on `/`.

## The Fix

Two complementary changes — one defensive (handles the link landing anywhere in the app), one corrective (makes the redirect target explicit and reliable).

### 1. Global recovery-hash interceptor (primary fix)

Add a small effect at the top of `AuthGate` (or a dedicated `<RecoveryRedirect />` component mounted inside `BrowserRouter`) that runs on every load:

- Inspect `window.location.hash` for `type=recovery`.
- If found AND the current pathname is not already `/reset-password`, immediately `navigate('/reset-password' + window.location.hash, { replace: true })`, **preserving the hash** so `ResetPasswordPage` can detect it.
- Also listen for `supabase.auth.onAuthStateChange` event `'PASSWORD_RECOVERY'` and do the same redirect — this catches the case where Supabase fires the event slightly later than the initial render.

This guarantees that no matter where the recovery link lands (`/`, `/dashboard`, `/welcome`, `/onboarding`, etc.), the user is forwarded to the reset screen with the recovery hash intact.

### 2. Harden `ResetPasswordPage`

- Remove the strict gate that hides the form when `isRecovery === false`. Instead:
  - Treat the page as the password-update screen for any authenticated session that arrived via recovery OR has a valid session within ~5 minutes of a `PASSWORD_RECOVERY` event.
  - If neither hash nor recovery event is present and there's no session, show the "Use the email link" fallback (current behavior, but only as a last resort).
- Keep the `onAuthStateChange` listener so the form unlocks as soon as Supabase fires `PASSWORD_RECOVERY`.

### 3. Verify Supabase Redirect URLs (configuration check)

Confirm in Lovable Cloud auth settings that the Redirect URL allow-list includes:
- `https://app.locum-ops.com/reset-password`
- `https://app.locum-ops.com/**`
- `https://locum-ops.lovable.app/reset-password`
- `https://locum-ops.lovable.app/**`
- (Optional) preview URL `https://*.lovable.app/**`

If any are missing, Supabase will silently drop `redirect_to` and fall back to the Site URL, which is what we believe is happening. I'll surface this as an action for you to verify, since it lives in cloud auth config rather than the codebase.

## Files to change

- `src/App.tsx` — add a `RecoveryRedirect` effect inside `BrowserRouter` that watches `location.hash` and `onAuthStateChange('PASSWORD_RECOVERY')` and force-navigates to `/reset-password` with the hash preserved.
- `src/pages/ResetPasswordPage.tsx` — relax the `isRecovery` gate so it also accepts an active session right after the recovery event, and show the form whenever the user has a recovery context.

## Why this will resolve the user-reported bug

The interceptor catches the recovery hash regardless of which authenticated route Supabase lands them on, so the user always sees the password form. The page hardening then ensures the form renders even in edge cases where the hash has already been processed by Supabase before the route mounted.
