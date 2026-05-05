## Add "Feedback now available" banner to Today (Dashboard)

Add a dismissible top banner on the Dashboard page announcing that users can now send feedback directly from the app via the new Feedback button in the header.

### New component
Create `src/components/dashboard/FeedbackAvailableBanner.tsx`:
- Mirrors the visual style of `ShiftTypeMigrationBanner` (rounded, primary-tinted background, left icon, dismiss `X` on the right) — keeps consistency with existing dashboard banners.
- Icon: `MessageCircle` (matches the FeedbackButton icon).
- Title: "Got feedback? We're listening."
- Body: "You can now send bugs, ideas, or confusion straight from the app — look for the Feedback button in the top right."
- Dismissal persisted via `profile.dismissed_prompts.feedback_announcement` (same pattern as other banners).
- Returns `null` if profile not loaded or dismissed.

### Integration
In `src/pages/DashboardPage.tsx`, render `<FeedbackAvailableBanner />` at the top of the dashboard content (just above `ShiftTypeMigrationBanner`, around line 719) so it sits at the very top of the Today screen alongside the existing one-time announcements.

No backend or schema changes needed — `dismissed_prompts` jsonb already supports arbitrary keys.