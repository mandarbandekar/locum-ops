# Mobile Settings — Hub + Dedicated Screens

Today on mobile, tapping the avatar in the header drops the user directly into the desktop Profile page rendered at mobile width: a horizontal tab bar (Profile / Calendar Sync / Rate Card / Your Account) with desktop‑sized cards. There is no Settings home, no back navigation, and the tab strip is the only way to move between sections.

This plan introduces a proper mobile Settings flow: a hub list, and each section as its own full screen with a back button.

## UX

**Settings hub (`/settings`)**
- Native‑style grouped list. Header: "Settings" + greeting subtitle (name).
- Rows (icon + label + chevron, tap to push screen):
  1. Profile
  2. Calendar Sync
  3. Rate Card
  4. Your Account
- Footer: app version, sign out.

**Section screens**
- Each section becomes its own mobile screen with a sticky top bar: `‹ Settings` back link + section title.
- Single‑column, mobile‑sized form controls. No tab strip.
- Auto‑save behavior is preserved (no "Save" button added/removed).
- Bottom tab bar remains visible (uses existing `MobileAppShell`).

**Entry points**
- Avatar button in `MobilePageHeader` now routes to `/settings` (instead of `/settings/profile`).
- Desktop is unchanged — `/settings` redirects to `/settings/profile` on desktop so existing tab nav still works.

## Technical

New files
- `src/pages/mobile/MobileSettingsPage.tsx` — hub list using `MobileAppShell` + grouped rows; sign out + version footer.
- `src/pages/mobile/settings/MobileSettingsProfilePage.tsx`
- `src/pages/mobile/settings/MobileSettingsCalendarSyncPage.tsx`
- `src/pages/mobile/settings/MobileSettingsRateCardPage.tsx`
- `src/pages/mobile/settings/MobileSettingsAccountPage.tsx`
- `src/components/mobile/MobileSubPageHeader.tsx` — reusable sticky header with back chevron + title (used by all four section screens; can be reused later).

Edits
- `src/App.tsx`: add `/settings` route. On mobile render `MobileSettingsPage`; on desktop `<Navigate to="/settings/profile" replace />`.
- `src/pages/SettingsProfilePage.tsx`, `SettingsCalendarSyncPage.tsx`, `SettingsRateCardPage.tsx`, `SettingsAccountPage.tsx`: at top, `const isMobile = useIsMobileShell(); if (isMobile) return <MobileSettings…Page />;` (mirrors the existing `SchedulePage` pattern).
- `src/components/mobile/MobilePageHeader.tsx`: avatar `onClick` → `/settings`.

Each mobile section screen
- Reuses the existing form logic from its desktop counterpart (same hooks: `useUserProfile`, `useAutoSave`, etc.) but re‑rendered with mobile primitives: full‑width inputs, larger tap targets (min‑h 44px), grouped cards using `--m-card` / `--m-border` tokens, no `SettingsNav`.
- Rate Card screen keeps the existing rate‑card editor logic; trimmed chrome (no desktop side rail), single‑column layout, sections collapsible if total height is excessive (decide during build based on content length).

## Out of scope
- No changes to desktop Settings.
- No changes to auto‑save, profile context, rate card data model, or calendar sync logic.
- No new settings sections; only the 4 already in `SettingsNav`.
