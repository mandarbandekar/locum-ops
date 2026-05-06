# Fix the "stacked banners" problem on the Dashboard

## What's wrong today

Every new feature ships its own full-width banner glued to the top of `DashboardPage`. A returning user currently sees, in order:

1. `FeedbackAvailableBanner` (feedback button announcement)
2. `ShiftTypeMigrationBanner` (categorize your rates)
3. `OnboardingHandoffBanner` (welcome, your back office is live)
4. Welcome banner (5-min setup)
5. Engagement-type announcement (platform shifts)
6. `GettingStartedChecklist` / `DashboardPromptCards`

Each one was added independently, has its own dismissal flag in `profile.dismissed_prompts`, its own colors, its own CTA pattern, and no priority logic. The dashboard becomes a wall of yellow/blue boxes before the user sees a single shift or invoice. New users get drowned. Returning users get ambushed every time we ship.

This is the recurring shape of the problem, not a one-off — every future feature will repeat it unless we build the rails.

## Goal

One predictable surface for "things you should know about," with rules for what shows up where, when, and for how long. New users see a focused setup path. Existing users get a calm, batched changelog instead of a banner avalanche.

## Proposed system

Three distinct surfaces, each with one clear job:

### 1. Onboarding lane (new users only)

- Keep `OnboardingHandoffBanner` + `GettingStartedChecklist` exactly as-is.
- These only render until activation criteria are met (already the case).
- No "What's New" announcements show while onboarding is active — new users shouldn't be told about features they haven't used yet.

### 2. What's New center (existing users)

A single compact entry point that replaces every standalone announcement banner.

- A small pill in the header next to Feedback/Tour: **"What's new"** with a dot when there are unread items.
- Clicking opens a side panel / popover listing recent updates, newest first, each with: title, 1–2 sentence description, optional CTA, optional "Learn more" link, and a "dismiss" affordance.
- Each item has an `id`, `publishedAt`, `audience` rule (e.g. "users with ≥1 facility", "users created before X"), and an optional `priority: 'highlight'` flag.
- Read state stored in `profile.seen_announcements: string[]` (additive, never destructive). The existing `dismissed_prompts` map continues to work for legacy entries during migration.
- Items auto-expire after N days so the panel stays short.

### 3. Inline "highlight" slot (rare, rate-limited)

For genuinely high-impact changes that benefit from being seen in context (e.g. shift-type migration, where action is required to keep data clean):

- At most **one** highlight banner renders above the dashboard at a time.
- Selected by the announcement system based on `priority: 'highlight'` + audience match + not-yet-dismissed.
- Same component shape every time — no more bespoke banner files per feature.
- Dismissal moves it into the What's New panel, where the user can re-open it.

## Migration of today's banners

| Today | New home |
|---|---|
| FeedbackAvailableBanner | What's New entry, no inline banner |
| ShiftTypeMigrationBanner | Inline highlight (action required), also listed in What's New |
| Engagement-type platform-shifts announcement | What's New entry |
| OnboardingHandoffBanner | Unchanged (onboarding lane) |
| Welcome banner | Unchanged (onboarding lane) |

Net effect: dashboard top goes from up to 5 banners → 0 or 1 banner + a quiet "What's new (2)" pill in the header.

## Authoring model

A single source-of-truth file, e.g. `src/lib/announcements.ts`:

```ts
export const announcements: Announcement[] = [
  {
    id: 'feedback-button-2026-04',
    title: "Got feedback? We're listening.",
    body: "Send bugs or ideas straight from the app — look for the Feedback button.",
    publishedAt: '2026-04-20',
    audience: 'all',
    expiresAfterDays: 30,
  },
  {
    id: 'shift-types-2026-05',
    title: 'Categorize your rates',
    body: 'Tag each rate with a shift type so it shows up across schedule and invoices.',
    cta: { label: 'Review & save', to: '/settings/rate-card' },
    publishedAt: '2026-05-01',
    audience: ctx => ctx.untypedShiftCount > 0,
    priority: 'highlight',
  },
  // ...
];
```

Adding a new feature = appending one entry. No more new banner components, no more dashboard edits, no more dismissal flags to invent.

## Technical notes

- New file: `src/lib/announcements.ts` (registry + types + audience evaluator).
- New component: `src/components/announcements/WhatsNewButton.tsx` (header pill + panel).
- New component: `src/components/announcements/HighlightBanner.tsx` (single inline slot).
- `profile.seen_announcements text[]` column added via migration; backfill from existing `dismissed_prompts` entries where ids overlap.
- Delete `FeedbackAvailableBanner.tsx`, `ShiftTypeMigrationBanner.tsx`, and the inline engagement-announcement JSX in `DashboardPage.tsx` once their entries exist in the registry.
- Header in `Layout.tsx` gains the WhatsNewButton between Feedback and Tour.
- Audience evaluator receives a small context object (`{ profile, shifts, facilities, untypedShiftCount, userCreatedAt }`) so rules stay declarative.
- One test file covering: ordering, audience filtering, seen-state persistence, single-highlight rule, expiry.

## Out of scope

- Server-driven announcements / CMS — registry stays in code for now.
- Email digests of "what's new" — separate decision.
- Per-page announcements (e.g. on Schedule, Invoices) — same primitives can be reused later, but this plan ships the dashboard surface only.
