# Add "My Notes" Announcement

## Goal
Register a new feature announcement in the What's New registry so users discover the new per-clinic "My Notes" journal with tags and custom tags.

## Changes

### File: `src/lib/announcements.ts`

1. **Import**: Add `NotebookPen` to the existing `lucide-react` import line.

2. **New registry entry** (inserted at the top of the `announcements` array, newest-first):

```typescript
  {
    id: 'clinic-notes-2026-06',
    title: 'Keep track of clinic impressions',
    body: 'Each facility now has a "My Notes" section where you can jot down what went well, flag watch-outs, and add free-form notes about your experience. Custom tags are supported too.',
    publishedAt: '2026-06-03',
    icon: NotebookPen,
    cta: { label: 'Open a clinic', to: '/facilities' },
    audience: ctx => ctx.facilities.length > 0,
  },
```

- **Audience**: Only shown to users who have at least one facility (they need a clinic to use the feature).
- **Priority**: `normal` (no `priority` field) — appears in the dropdown list only, not as a dashboard banner highlight. The existing biweekly-billing highlight stays in the banner slot.
- **No expiry**: The announcement does not auto-expire.

## Out of Scope
- No database migrations needed (read/dismiss state uses existing `profile.dismissed_prompts`).
- No UI component changes needed (WhatsNewButton and HighlightBanner already consume the registry dynamically).