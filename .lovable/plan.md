# Tier 2 — Clinic-facing date displays in facility timezone

Surgical, display-only edits. No changes to sorts, filters, instant comparisons, schema, RLS, or write paths. No new deps.

## Pattern
Replace `format(new Date(<instant>), PATTERN)` with `formatDateInTz(<instant>, TZ, PATTERN)` for shift instants; times use `formatTimeInTz(<instant>, TZ)`. `TZ` = the shift's facility timezone (with `BROWSER_TZ` fallback where the existing files already use one).

---

## 1. `src/pages/FacilityDetailPage.tsx`
`formatDateInTz` is already imported (line 35). No new import.

- **Line 684** — before:
  ```tsx
  {format(new Date(s.start_datetime), 'MMM d, yyyy')}
  ```
  after:
  ```tsx
  {formatDateInTz(s.start_datetime, facility.timezone, 'MMM d, yyyy')}
  ```
- **Line 687** — before:
  ```tsx
  <td className="p-3 text-muted-foreground hidden sm:table-cell">{format(new Date(s.start_datetime), 'h:mm a')} - {format(new Date(s.end_datetime), 'h:mm a')}</td>
  ```
  after:
  ```tsx
  <td className="p-3 text-muted-foreground hidden sm:table-cell">{formatTimeInTz(s.start_datetime, facility.timezone)} - {formatTimeInTz(s.end_datetime, facility.timezone)}</td>
  ```
  Add `formatTimeInTz` to the existing `@/lib/tzTime` import on line 35.
- Line 48 sort is **left unchanged** (sorts by UTC instant — correct).

## 2. `src/components/schedule/ConfirmationDetailDrawer.tsx`
Extend existing import on line 16: `import { formatTimeInTz, formatDateInTz } from '@/lib/tzTime';`. Reuse `tz = facility?.timezone || BROWSER_TZ` (already defined inline at line 47 inside `defaultBody`; for lines 156/157/174/175 it must be resolved at the call site since `tz` is scoped inside `useMemo`).

- **Line 49** (email body) — before:
  ```ts
  .map(s => `  - ${format(new Date(s.start_datetime), 'EEE, MMM d')} — ${formatTimeInTz(s.start_datetime, tz)} – ${formatTimeInTz(s.end_datetime, tz)}`)
  ```
  after:
  ```ts
  .map(s => `  - ${formatDateInTz(s.start_datetime, tz, 'EEE, MMM d')} — ${formatTimeInTz(s.start_datetime, tz)} – ${formatTimeInTz(s.end_datetime, tz)}`)
  ```
- **Line 156** — before:
  ```tsx
  {firstShift && <span>First: {format(new Date(firstShift.start_datetime), 'MMM d')}</span>}
  ```
  after:
  ```tsx
  {firstShift && <span>First: {formatDateInTz(firstShift.start_datetime, facility?.timezone || BROWSER_TZ, 'MMM d')}</span>}
  ```
- **Line 157** — same swap for `lastShift` with `'MMM d'`.
- **Line 174** — before:
  ```tsx
  <TableCell className="text-sm py-2">{format(new Date(s.start_datetime), 'MMM d')}</TableCell>
  ```
  after:
  ```tsx
  <TableCell className="text-sm py-2">{formatDateInTz(s.start_datetime, facility?.timezone || BROWSER_TZ, 'MMM d')}</TableCell>
  ```
- **Line 175** — same swap with pattern `'EEE'`.
- Line 273 (`a.created_at`) is **left unchanged** (audit timestamp).

## 3. `src/components/schedule/ClinicConfirmationsTab.tsx`
Extend existing import on line 16: `import { formatTimeInTz, formatDateInTz } from '@/lib/tzTime';`. `tz` is already resolved one line above at line 215.

- **Line 218** — before:
  ```tsx
  <td className="px-3 py-2 text-sm">{format(new Date(s.start_datetime), 'EEE, MMM d')}</td>
  ```
  after:
  ```tsx
  <td className="px-3 py-2 text-sm">{formatDateInTz(s.start_datetime, tz, 'EEE, MMM d')}</td>
  ```
- Lines 280 and 300 (`sent_at`) are **left unchanged** (send timestamps render fine locally).

## 4. `src/pages/PublicConfirmationPage.tsx` + `supabase/functions/public-confirmation/index.ts`

### Edge function (read-only SELECT change, no writes)
- **Line 56** — before:
  ```ts
  supabase.from('facilities').select('name').eq('id', record.facility_id).single(),
  ```
  after:
  ```ts
  supabase.from('facilities').select('name, timezone').eq('id', record.facility_id).single(),
  ```
- **Line 80–86** — extend the returned payload with `timezone: facRes.data?.timezone || 'America/New_York'` (safety fallback matches `TIMEZONE_SAFETY_FALLBACK`).

### Page
- Add `timezone: string;` to the `ConfirmationData` interface (line 9–15).
- Add `import { formatDateInTz, formatTimeInTz } from '@/lib/tzTime';`.
- In `loadConfirmation`, set `timezone: payload.timezone` on the `setData(...)` object.
- **Line 119** — before:
  ```tsx
  <TableCell className="text-sm py-2.5">{format(new Date(s.start_datetime), 'MMM d, yyyy')}</TableCell>
  ```
  after:
  ```tsx
  <TableCell className="text-sm py-2.5">{formatDateInTz(s.start_datetime, data.timezone, 'MMM d, yyyy')}</TableCell>
  ```
- **Line 120** — same swap with pattern `'EEEE'`.
- **Line 122** — before:
  ```tsx
  {format(new Date(s.start_datetime), 'h:mm a')} – {format(new Date(s.end_datetime), 'h:mm a')}
  ```
  after:
  ```tsx
  {formatTimeInTz(s.start_datetime, data.timezone)} – {formatTimeInTz(s.end_datetime, data.timezone)}
  ```
- Line 133 (`data.generatedAt`) is **left unchanged** (generation timestamp).

---

## Verification
After edits, output a per-file before/after report confirming only the lines above changed, and run `rg "format\(new Date\(" src/pages/FacilityDetailPage.tsx src/components/schedule/ConfirmationDetailDrawer.tsx src/components/schedule/ClinicConfirmationsTab.tsx src/pages/PublicConfirmationPage.tsx` to confirm no stray shift-instant `format(new Date(...))` calls remain (audit/send timestamps may still match — they're intentionally left).

## Out of scope
Tier 1 (done), Tier 3 (edge timing, dashboard "today"), `BlockTimeDialog`, schema, sorts/filters, write paths.
