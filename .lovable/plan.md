Add two new "What's New" announcements to `src/lib/announcements.ts` for features implemented today.

### Scope

Single file change: `src/lib/announcements.ts`

### Announcement 1 — Biweekly Billing Cadence
- **ID:** `biweekly-billing-2026-06`
- **Title:** Biweekly billing is here
- **Body:** Set a 14-day billing cycle anchored to any pay-period start date. LocumOps now groups shifts into the correct two-week windows automatically when generating invoice drafts.
- **PublishedAt:** `2026-06-02`
- **Icon:** `CalendarDays` (from `lucide-react`)
- **CTA:** { label: 'Set cadence', to: '/settings/invoicing' }
- **Priority:** `highlight`
- **Audience:** `ctx => ctx.facilities.length > 0`

### Announcement 2 — CPA Prep Improvements
- **ID:** `cpa-prep-2026-06`
- **Title:** Cleaner CPA prep packets
- **Body:** Trip place labels now include the clinic name and full address, and the mileage summary grid displays all 12 months for a full-year review at a glance.
- **PublishedAt:** `2026-06-02`
- **Icon:** `FileText` (from `lucide-react`)
- **CTA:** { label: 'Review packet', to: '/business' }
- **Audience:** `all`

### Technical Detail

Import `CalendarDays` and `FileText` alongside the existing `lucide-react` imports, then prepend both entries to the `announcements` array (newest entries at the top per registry convention). No other files need modification.