
Recreate the WelcomePage as a centered modal-style card matching the Skool reference: white card with logo + product name at top, large bold "Create your Locum Ops account" heading, four stacked inputs (First name, Last name, Email, Password), full-width SIGN UP button, terms/privacy line, and "Already have an account? Log in" link. Replace the current value-prop/steps layout entirely. Wire the form to existing `signUp` from `useAuth` (profession defaults to 'vet', company optional empty). On success show the existing "check your email" message; "Log in" navigates to `/login`. Keep dimmed page background to evoke the modal-on-page feel.

Files: `src/pages/WelcomePage.tsx` only.
