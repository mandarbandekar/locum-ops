

## Plan: Streamline Schedule Page Header UX

### Problem
The Schedule page header stacks multiple rows of controls — title + action buttons, view switcher tabs, date navigation, summary stats, and calendar layer filters — creating a busy, cluttered top section that pushes the actual calendar content down and requires scrolling.

### Design approach
Consolidate the header into a compact, single-purpose toolbar with clear visual separation between navigation and actions. Follow the fixed-height layout principle — no full-page scroll.

### Changes

**`src/pages/SchedulePage.tsx`**

1. **Merge title row + view switcher into one line**: Move "Schedule" title, view tabs (Month/Week/List/Confirm/Sync), and action buttons into a single horizontal bar. Title on the left, segmented view switcher in the center, actions on the right.

2. **Inline date navigation with the calendar heading**: Combine the `< April 2026 >` navigation and "Today" button into the same row as the summary stats (shifts/hours/expected), creating one compact sub-bar instead of two separate sections.

3. **Move Calendar Layers into a dropdown/popover**: Replace the always-visible `CalendarFilters` row with a small "Layers" button that opens a popover. This reclaims an entire row of vertical space. The button shows a dot indicator when non-default layers are active.

4. **Remove the Tour button from the header**: The tour is already accessible from the global top bar. Remove the inline "Tour" button to reduce clutter.

5. **Apply fixed-height layout to the calendar container**: Wrap the month/week/list views in a container that fills remaining viewport height using `calc(100vh - header)` so the calendar never causes page scroll.

### Result
The header collapses from ~5 visual rows down to 2: one toolbar (title + views + actions) and one navigation bar (date picker + stats). The calendar fills the remaining space without scrolling.

### Files modified
- `src/pages/SchedulePage.tsx` — restructure header layout, add layers popover, fixed-height container
- `src/components/schedule/CalendarFilters.tsx` — adapt to render inside a Popover content area (minor class tweaks)

