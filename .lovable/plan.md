# Fix: Content cutoff on small / short laptop screens

## The problem

Two real issues are causing content to disappear on smaller laptops (e.g. 13" MacBooks at ~800px tall, like your current 815×616 viewport):

1. **Sidebar clips its own items.** `AppSidebar` wraps its content in `SidebarContent` with `overflow-hidden`. When the viewport is short, the bottom groups (Compliance → "Credentials & CE", and Settings) get cut off with no way to reach them.
2. **Main area uses `overflow-hidden` aggressively.** `Layout.tsx`'s `<main>` and several pages (Dashboard, Schedule) lock to `100vh` and hide overflow. On short viewports, page content beneath the fold becomes unreachable instead of allowing internal scroll.

There is also no global safety net — pages assume a minimum height and don't degrade gracefully below it.

## What I'll change

### 1. Sidebar — never clip nav items

`src/components/AppSidebar.tsx`
- Replace `SidebarContent`'s `overflow-hidden` with `overflow-y-auto` and add a thin scrollbar style. Sidebar stays "non-scrollable" visually on normal screens (per design memory) but gracefully scrolls when the viewport can't fit all groups. This guarantees Credentials & CE and Settings are always reachable.
- Ensure `SidebarFooter` (Settings) stays pinned via `mt-auto` so it doesn't float away when content shrinks.

### 2. Layout shell — allow internal scroll, not clipping

`src/components/Layout.tsx`
- Change the outer wrapper from `min-h-screen` to `h-screen` with `overflow-hidden`, so the header is sticky and the main area is the only scroll surface (no double scrollbars).
- Change `<main>` from `overflow-hidden` to `overflow-y-auto` and add `min-h-0` to its flex parent. This is the standard pattern for a fixed shell with scrollable content.
- Reduce vertical padding on short viewports (`py-3` instead of `p-7`) using a min-height media check so more content fits above the fold.

### 3. Dashboard (Command Center) — fit-or-scroll

`src/pages/DashboardPage.tsx`
- The "fixed-height hub" rule (per memory) is preserved on tall screens, but on viewports shorter than ~720px the dashboard already uses `min-h-[calc(...)]` which forces overflow. I'll:
  - Keep the fixed-height layout when `min-height: 760px` (md+ laptops).
  - Below that, switch to a natural-flow layout that scrolls inside `<main>`, so the "Needs Your Attention" section and footer are always reachable.

### 4. Schedule page — internal calendar scroll

`src/pages/SchedulePage.tsx`
- Keep the fixed `h-[calc(100vh-4rem)]` shell, but add a minimum height floor (`min-h-[560px]`) so on very short screens the whole page becomes scrollable instead of squashing the calendar to unusable.

### 5. Responsive audit pass (lightweight)

- Verify the Layout header doesn't push content off-screen (it's already `h-14`, fine).
- Confirm dialogs use `max-h-[85vh] overflow-y-auto` (most already do; will spot-fix any that don't in Add Shift / Add Expense / Invoice wizard if found during the pass).

## Out of scope

- No changes to sidebar visual design, colors, or group structure.
- No changes to dashboard tile composition or copy.
- No new breakpoints introduced beyond Tailwind defaults plus one min-height media query.

## Files to modify

- `src/components/Layout.tsx`
- `src/components/AppSidebar.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/SchedulePage.tsx`

## How to verify after rollout

1. Resize browser to ~1280×700 — Credentials & CE and Settings remain visible/reachable in the sidebar.
2. Resize to ~1024×600 — dashboard scrolls smoothly within the main area, header stays pinned.
3. On a 1440×900 laptop — dashboard still uses the fixed-height "command center" layout with no page scroll, matching current design.
