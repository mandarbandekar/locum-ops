

## Plan: Align Schedule Page with Standard Module Layout

### Problem
The Schedule page header uses custom inline styles (`text-lg font-semibold`, `bg-card/50` toolbar, compact `h-8` buttons) that look visually different from every other module page. Other pages use the standard `page-header`, `page-title` (Manrope, 22-34px bold), and `page-subtitle` CSS classes, plus standard-sized buttons and the `TabsList`/`TabsTrigger` component for view switching.

### Design approach
Bring the Schedule page in line with the established pattern while keeping the streamlined 2-row layout. Use the same heading hierarchy, font family, tab switcher component, and button sizes as Invoices, Expenses, Credentials, etc.

### Changes — `src/pages/SchedulePage.tsx`

1. **Title row**: Replace the custom `text-lg font-semibold` title with the standard `page-header` / `page-title` pattern. Add a `CalendarDays` icon and `page-subtitle` to match Expenses/Credentials/Tax pages. Remove the `bg-card/50` background — other modules don't use a distinct header background.

2. **View switcher**: Replace the custom hand-rolled segmented control (`bg-muted p-0.5 rounded-lg` with manual active states) with the standard `TabsList` / `TabsTrigger` components already used across Expenses, Credentials, Tax Center, etc. This gives consistent rounded-xl pill styling, font size, and active state.

3. **Action buttons**: Use standard `size="sm"` buttons (not the overridden `h-8 text-xs px-3` compact ones) to match Invoices and Facilities pages.

4. **Sub-bar (date nav + stats)**: Keep the compact navigation row but use standard spacing (`px-0` within the content flow, not `px-4` with separate `border-b`) — let it flow naturally within the page content area like summary strips do on Invoices.

5. **Content container**: Keep the fixed-height `h-[calc(100vh-4rem)]` layout since the calendar genuinely needs it, but use the standard content padding pattern.

### Result
The Schedule page will share the same Manrope heading, TabsList view switcher, button sizes, and spacing rhythm as Expenses, Invoices, Credentials, and other modules — while keeping the compact navigation bar and fixed-height calendar that make it functional.

### Files modified
- `src/pages/SchedulePage.tsx` — restructure header to use `page-header`/`page-title`/`page-subtitle`, replace custom view switcher with `TabsList`/`TabsTrigger`, normalize button sizing and spacing

