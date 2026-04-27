## Capture Company/Practice Name at Signup

Add a "Company / Practice name" field to the account creation form on `WelcomePage.tsx` and persist it so it flows into the user's profile and is reused across the app (invoices, settings, outreach defaults).

### What changes

1. **Signup form (`src/pages/WelcomePage.tsx`)**
   - Add a new required field `companyName` between Last name and Email.
   - Label: "Company / Practice name" with a helper hint: "You can change this later in Settings."
   - Pass `company: companyName.trim()` into the existing `signUp(...)` call (currently hardcoded to `''`).
   - Add to the front-end validation (require non-empty before submit).

2. **Persistence (already wired — no change needed)**
   - `AuthContext.signUp` already forwards `company` into Supabase auth `user_metadata.company`.
   - `UserProfileContext` already reads `meta.company` on first profile creation and writes it to `user_profiles.company_name` (line 268).
   - So once the field is captured at signup, it automatically populates the profile row and is available everywhere `profile.company_name` is consumed (Settings → Profile, invoice defaults, outreach, exports).

3. **Settings → Profile (`src/pages/SettingsProfilePage.tsx`)**
   - No structural change. The existing "Company name" input will already display the value the user entered at signup, and remains editable.

### Why this is minimal

The data plumbing (`auth metadata → user_profiles.company_name → profile context → app surfaces`) already exists end-to-end. The only missing piece is collecting the value in the signup UI.

### Files touched

- `src/pages/WelcomePage.tsx` — add the input + validation + pass into signUp.

No database migration, no context changes, no Settings page changes required.
