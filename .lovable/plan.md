Add a What's New announcement for the redesigned Mileage Tracker.

### Change

Append one new entry to the `announcements` array in `src/lib/announcements.ts`.

### Copy

- **Title:** "Mileage Tracker just got sharper"
- **Body:** "Your drives are now organized under Business Drives and Mileage Reports. See money found this year at a glance, add miles you tracked elsewhere, and generate cleaner PDF reports with your CPA with year-to-date totals."
- **CTA:** "Open tracker" → `/expenses?tab=mileage`
- **Icon:** `Car` (lucide-react)
- **Priority:** `highlight` (renders inline banner on dashboard until dismissed)
- **Audience:** `all`
- **Published:** `2026-06-04`

### No other files touched

WhatsNewButton and HighlightBanner already consume the registry automatically.

### Technical note

Import `Car` from lucide-react alongside existing icons.