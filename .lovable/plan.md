## Goal

Improve visibility of the Shift Type rate-card migration nudge on the Today (Dashboard) screen by promoting it to the top of the page and aligning copy + CTAs to your spec.

## Current state

The `ShiftTypeMigrationBanner` already exists and renders on `DashboardPage.tsx`, but it sits **fourth** in the banner stack — below the onboarding handoff, welcome banner, and the older engagement-type announcement. Easy to miss.

Current copy: "Categorize your relief work — You can now tag each rate by shift type… apply the same types to your N past shifts in one click." with a single "Set up shift types →" link.

## Changes

### 1. Move the banner to the top of the Today screen
File: `src/pages/DashboardPage.tsx`

Reorder the banner stack so `ShiftTypeMigrationBanner` renders **first**, above:
- Onboarding handoff banner
- Welcome banner
- Engagement-type announcement

Rationale: the migration nudge is time-sensitive (only shows for users with untyped shifts) and is the newest feature surface. Other banners are either evergreen (welcome) or already dismissed by most active users.

### 2. Refine banner copy and add two distinct CTAs
File: `src/components/dashboard/ShiftTypeMigrationBanner.tsx`

Update the banner content to match your spec:

- **Headline:** `New: categorize your rates`
- **Body:** `Tag each rate with a shift type (GP, ER, Surgery…) so it shows up across your schedule and invoices. We've pre-filled suggestions where we could.`
- **Primary CTA:** `Review & Save` → navigates to `/settings/rate-card` (same destination, sharper label)
- **Secondary CTA:** `Skip for now` → dismisses the banner (writes `dismissed_prompts.shift_type_migration = true`)

Visual treatment stays the same: sage primary tint, Tag icon, top-right X for dismissal, flat themed border (no box shadows). The "X past shifts" count is dropped from the body since the new copy emphasizes the pre-filled suggestions instead — simpler and matches your spec exactly.

## Out of scope

- No changes to the backfill Edge Function, inference utility, or Rate Card page — those already work.
- No changes to dismissal storage (still `profile.dismissed_prompts.shift_type_migration`).
- Other Dashboard banners are unchanged; only their relative order shifts.

## Files touched

- `src/pages/DashboardPage.tsx` — reorder banner block
- `src/components/dashboard/ShiftTypeMigrationBanner.tsx` — copy + CTA labels
