

# Sidebar Visual Polish + Dynamic Badges

## Overview
Refresh the left navigation with better visual hierarchy, more informative badges, and subtle polish to match the premium dark sidebar aesthetic.

## Changes

### 1. Dynamic Badge Counts (`useBadgeCounts` in AppSidebar.tsx)
Expand the existing hook to surface more actionable counts:
- **Invoices & Payments**: Keep draft count, add overdue count → show combined (e.g. `3` drafts + `1` overdue = badge shows `4`)
- **Credentials & CE**: Count credentials expiring within 60 days → show badge when > 0
- **Schedule**: Count unconfirmed upcoming shifts (confirmations needing action) → show badge when > 0

Badges use color coding:
- Default (gray/secondary) for informational counts
- Destructive/red tint for overdue invoices or expired credentials
- Warning/amber for items expiring soon

### 2. Visual Polish (AppSidebar.tsx + index.css)
- **Active state**: Add a left accent bar (3px primary-colored border-left) on the active nav item instead of just a background change, making the current page instantly scannable
- **Hover states**: Add a subtle scale transform (`scale-[1.01]`) and smoother transition on hover
- **Group headers**: Slightly more letter-spacing and uppercase styling for group labels to create stronger visual separation
- **Icon treatment**: Active item icons get full opacity (1.0) and primary color tint; inactive stay at 0.6 opacity
- **Spacing**: Tighten vertical gap between items within a group (currently `space-y-0.5`); add slightly more gap between groups
- **Footer separator**: Add a subtle top border or divider line above the Settings item to visually separate it from the main nav

### 3. Badge Component Styling
- Use a small dot indicator (no number) for low-urgency items (e.g. 1 credential expiring in 50 days)
- Use numbered pill badges for higher counts or urgent items
- Animate badge appearance with a subtle fade-in when counts change

## Technical Details
- `useBadgeCounts` will read `invoices` from `DataContext` (already available) and `credentials` from `useCredentials` or a lightweight Supabase query
- For credentials, add a simple `useQuery` call filtered to `expiration_date` within 60 days of today
- All changes are in `AppSidebar.tsx` and `index.css` — no database changes needed
- Confirmations count uses the existing `useConfirmations` hook or a direct query

## Files Modified
- `src/components/AppSidebar.tsx` — badge logic, visual classes, active state indicator
- `src/index.css` — sidebar-specific utility classes for active bar and transitions

