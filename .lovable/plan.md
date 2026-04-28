## Improve the Clinics (Practice Facilities) Page

The current page works but feels sparse and a little flat after the search bar and filter were removed. The toolbar is mostly empty, the cards repeat the same metadata in a busy stack, and the list view is plain. This pass tightens the hierarchy, adds a useful summary, and gives both views a more polished, "calm competent colleague" feel — consistent with the rest of LocumOps (flat design, themed borders, no shadows).

### What changes

**1. Header & summary strip**
- Add a one-line subtitle under the page title: e.g. "Your network of clinics, billing contacts, and engagement terms."
- Replace the empty toolbar row with a compact **Summary Strip** (single bordered card, 3-4 stats):
  - Total clinics
  - Active
  - Direct-bill (where you invoice)
  - Missing billing contact (amber, only shown if > 0)
- Keep the view-mode toggle (cards / list) right-aligned on the same row as the summary.

**2. Card view refinements**
- Remove the hover shadow (per flat-design rule); use a subtle border color shift on hover instead.
- Tighten internal spacing (p-4 instead of p-5) and reduce vertical stack noise:
  - Line 1: clinic name + status pill (right)
  - Line 2: address with map pin (muted, single line, truncated)
  - Divider
  - Line 3: engagement pill + billing cadence (inline, smaller)
  - Line 4: billing contact OR "No billing contact" warning OR "Paid by employer/platform" note
- Move the trash icon to a consistent top-right slot that's always visible at low opacity (not hover-only) — easier to discover, still unobtrusive.
- Empty state: replace the plain text with a centered illustration block (icon + "No facilities yet" + "Add your first clinic" CTA) when `facilities.length === 0`.

**3. List view refinements**
- Add `table-fixed` with explicit `<colgroup>` widths for symmetric columns (matches the recent invoice table cleanup).
- New columns: Name | Address | Status | Engagement | Billing | Actions.
- Right-align the actions column header and cell.
- Use `tabular-nums` and consistent badge sizing.
- Zebra-stripe rows subtly with `even:bg-muted/20` for scannability.

**4. Cleanup**
- Remove unused `search`, `statusFilter`, `Input`, `Select`, `Search` imports/state (left over from the removed filter bar).

### Technical details

- File: `src/pages/FacilitiesPage.tsx` (single-file change).
- Derive summary counts from `facilities` in a `useMemo`.
- Reuse existing `StatusBadge`, `getEngagementPill`, and `Badge` components — no new design tokens needed.
- Stick to semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `text-amber-600`) per the design system.
- No data model, route, or context changes.

### Out of scope
- No new filters or search (recently removed by request).
- No changes to facility detail page, add dialog, or data layer.
