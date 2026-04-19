
The user wants the top header bar improved: remove "LocumOps" branding, emphasize the greeting/business name, and fix the briefing banner appearance in dark mode.

Looking at the screenshot and code:
- `Layout.tsx` header currently shows: `LocumOps — {company}` (small, 15px)
- The greeting "Good morning, Sarah" lives in the briefing banner (`BriefingBanner.tsx`) as part of a paragraph
- `BriefingBanner.tsx` hardcodes `color: '#374151'` which renders dark gray text in dark mode (poor contrast on dark card)

## Plan

**1. Update `src/components/Layout.tsx` header**
- Remove "LocumOps" wordmark and the em-dash separator
- Display the business/company name prominently on the left:
  - Larger font (~18px), semibold, Manrope, foreground color
  - Truncate gracefully on small screens
- If no company name, fall back to a clean "Dashboard" label or just empty (keep sidebar trigger + actions)
- Keep `SidebarTrigger`, Take a Tour, Demo Guide, ThemeToggle on the right unchanged

**2. Refresh `src/components/dashboard/BriefingBanner.tsx`**
- Pull the greeting "Good morning, {firstName}" out as a standalone, prominent line:
  - 20–22px, Manrope semibold, full foreground color
- Render the rest of the briefing sentences below as supporting text (15px, relaxed line height)
- Replace hardcoded `color: '#374151'` with theme tokens (`text-foreground` / `text-muted-foreground`) so dark mode renders properly
- Keep the left accent bar (teal / ochre based on urgency) and icon
- Slightly increase padding and use `bg-card` with `border-border` for cleaner contrast in both themes

**3. Wire greeting into the banner**
- `DashboardPage.tsx` currently composes the greeting inside `briefingShared.sentences`. Split it: pass `greeting` (e.g. "Good morning, Sarah.") as a separate prop to `BriefingBanner`, and keep the remaining sentences as the body paragraph.
- Update `dashboardBriefing.ts` if needed to return greeting separately, OR simply slice the first sentence in `DashboardPage.tsx` before passing to the banner (lighter touch — preferred).

## Visual result
- Top bar: clean, just the business name in bold on the left + actions on the right
- Briefing banner: large greeting headline, supporting insight paragraph beneath, fully theme-aware in light & dark mode

## Files to edit
- `src/components/Layout.tsx`
- `src/components/dashboard/BriefingBanner.tsx`
- `src/pages/DashboardPage.tsx` (split greeting from body sentences when calling `<BriefingBanner />`)
