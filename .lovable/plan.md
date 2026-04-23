

## Redesign left navigation: workflow-first IA

### Goal

Reorganize the sidebar around the relief vet's daily workflow (Work → Money → Compliance), add a prominent "+ Quick Add" primary action, and refresh the brand lockup. Result: fewer top-level destinations, clearer mental model, premium feel.

### New structure

```text
┌─────────────────────────────┐
│ 🌿 LocumOps                 │   ← teal emblem + dark teal wordmark
├─────────────────────────────┤
│  [ + Quick Add ]            │   ← full-width primary button
├─────────────────────────────┤
│  WORK                       │
│   • Today                   │   → /
│   • Clinics                 │   → /facilities
│   • Schedule                │   → /schedule
│                             │
│  MONEY                      │
│   • Invoices                │   → /invoices
│   • Expenses & Mileage      │   → /expenses
│   • Profit & Reports        │   → /business
│   • Taxes                   │   → /tax-center
│                             │
│  COMPLIANCE                 │
│   • Credentials & CE        │   → /credentials
├─────────────────────────────┤
│  ⚙  Settings                │   → /settings/profile
└─────────────────────────────┘
```

### Route mapping (no route changes)

| New label | Existing route | Existing icon kept |
|---|---|---|
| Today | `/` | LayoutDashboard |
| Clinics | `/facilities` | Building2 |
| Schedule | `/schedule` | CalendarDays |
| Invoices | `/invoices` | FileText (badge: drafts + overdue) |
| Expenses & Mileage | `/expenses` | Receipt |
| Profit & Reports | `/business` | TrendingUp (was Activity) |
| Taxes | `/tax-center` | Landmark |
| Credentials & CE | `/credentials` | ShieldCheck (badge: expiring) |
| Settings | `/settings/profile` | Settings |

Removed top-level entries: "Relief Business Hub" merges into **Profit & Reports** (same `/business` route, just renamed). All other existing routes still work — only labels and groupings change.

### "+ Quick Add" button

Full-width primary CTA directly under the logo (hidden when sidebar is collapsed; replaced by an icon-only `+` button). Opens a small dropdown menu with the four most common create actions:

- Add Shift → opens `ShiftFormDialog` (event already wired on `/schedule`; we'll dispatch a window event the schedule page listens for, or navigate to `/schedule?new=1`)
- Add Clinic → navigate `/facilities?new=1` (existing pattern)
- Add Invoice → navigate `/invoices?new=1`
- Log Expense → navigate `/expenses?new=1`

Uses existing `DropdownMenu` from shadcn for consistency. Button uses `variant="default"` (sage green primary) with `Plus` icon, height `h-10`, full-width within sidebar padding.

### Brand lockup

Replaces the current logo block at top of sidebar:

- **Emblem**: small SVG (24×24) — abstract paw-pad + leaf hybrid in teal `hsl(var(--primary))`. Inline SVG so it inherits theme. Geometric, two-tone teal, friendly-professional.
- **Wordmark**: "LocumOps" in DM Sans 600, dark teal (`hsl(var(--sidebar-logo-text))` already exists), tracking-tight, 16px.
- **Collapsed state**: emblem only, centered.

The current `locumops-logo.png` reference stays in the asset folder (still used on Welcome / Login per prior task) but the **sidebar** switches to the new inline SVG + text lockup for crispness at small sizes and theme-awareness.

### Visual treatment

- Section labels (`WORK`, `MONEY`, `COMPLIANCE`): existing `.sidebar-group-label` style — uppercase, 11px, muted, tracked. No collapsible chevrons (the previous accordion behavior is removed; sections are always visible — fewer clicks, less chrome).
- Nav items: existing `.sidebar-nav-item` styles (active = teal tint + primary text). 18px lucide icon, 14px label, badges right-aligned.
- Spacing: 12px between sections, 2px between items within a section.
- Bottom: `Settings` pinned in `SidebarFooter` with a top border, exactly as today.

### Files

**Modified:**
- `src/components/AppSidebar.tsx`
  - Replace `groups` array with the new 3-group structure (`WORK`, `MONEY`, `COMPLIANCE`); drop the standalone Dashboard block (Today is now the first item under WORK).
  - Remove `Collapsible` wrapping around groups (sections are always open).
  - Replace logo block with new emblem SVG + wordmark.
  - Add `<QuickAddMenu />` component just under the logo.
  - Keep `useBadgeCounts` exactly as-is (invoice + credential badges still apply).
  - Swap `Activity` icon for `TrendingUp` on Profit & Reports.

**New:**
- `src/components/QuickAddMenu.tsx` — full-width primary button + DropdownMenu with the 4 create actions. Handles collapsed-sidebar state (icon-only).
- `src/components/brand/LocumOpsMark.tsx` — small inline SVG component for the teal paw-leaf emblem (accepts `className` for sizing).

**Untouched:**
- All routes, pages, data hooks, badge logic, theme tokens.
- `WelcomePage` / `LoginPage` lockups (those use the PNG; unchanged).
- `SettingsNav`, page contents, dashboard logic.

### Verification

- Sidebar shows three labeled sections (WORK / MONEY / COMPLIANCE) with the items in the exact order specified.
- "+ Quick Add" sits under the logo, full-width, opens a 4-item dropdown, each item lands on the correct screen / opens the correct dialog.
- Active route highlighting still works (e.g., on `/business`, "Profit & Reports" is highlighted).
- Invoice and Credential badges still appear with correct counts and variants.
- Collapsed sidebar: emblem centered, Quick Add becomes a `+` icon button, nav items become icon-only with tooltips (existing `SidebarMenuButton` tooltip behavior).
- Settings remains pinned at the bottom.
- No broken routes; "Relief Business Hub" link from anywhere else in the app still resolves (route `/business` unchanged).

