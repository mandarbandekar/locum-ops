## Scope
Information-architecture + layout refactor of the Clinics section across desktop and mobile. No schema changes, no new product features, no changes to shift creation, invoice generation, confirmation, calendar, timezone, or invoice numbering. Internal model stays `facilities`; user-facing copy says "Clinics".

## Files touched
- `src/pages/FacilitiesPage.tsx` — list redesign (desktop + responsive)
- `src/pages/FacilityDetailPage.tsx` — header + new 5-tab IA (Brief / Schedule / Payment / Notes / Docs), Brief is default
- `src/pages/mobile/MobileClinicsPage.tsx` — mobile list redesign
- `src/pages/mobile/MobileClinicDetailPage.tsx` — mobile detail with same 5 tabs + sticky bottom action bar
- New presentational components under `src/components/facilities/brief/`:
  - `NextShiftCard.tsx`
  - `NeedsAttentionCard.tsx`
  - `ThingsToRememberCard.tsx`
  - `PaymentSetupCard.tsx`
  - `KeyContactCard.tsx`
  - `RecentActivityCard.tsx`
  - `ClinicCard.tsx` (shared list card for desktop + mobile)
  - `ClinicListFilters.tsx` (chips + search + stat chips)
  - `useClinicBrief.ts` (derives Brief data from existing queries: next shift, attention states, billing setup, primary contact, recent activity)

## Clinics List (desktop + mobile)
- Header: title "Clinics", subtitle, primary "Add Clinic" button, search input.
- Filter chips: All / Direct / Platform-paid / Needs action / Archived (Archived only rendered when ≥1 archived exists).
- Compact stat chips row: Total / Direct / Platform-paid / Need attention.
- Clinic cards (responsive grid on desktop, single column on mobile) showing: name, city/state, engagement chip (Direct/Roo/Platform-paid), next shift, primary rate, billing/payment setup, primary contact (or "Missing billing contact"), attention state pill with specific language. One primary action per card (Send Confirmation / Add Shift). Secondary actions in More menu. No delete icon visible by default.

## Clinic Detail
- Header: Back to Clinics, name, address, engagement chip, muted Active chip if useful, timezone if available. Header actions: Add Shift, Send Confirmation (direct only), Create Invoice (direct only), More.
- Tabs: Brief (default) / Schedule / Payment / Notes / Docs. Existing tab contents remapped:
  - Brief: new cheat-sheet (see below).
  - Schedule: existing Shifts content, grouped Upcoming / Past, cards on mobile, table on desktop.
  - Payment: invoicing prefs + Rates + Invoices + Mileage + billing contact + terms + invoice prefix. Platform-paid clinics show "Paid by platform" and hide direct-invoice prompts.
  - Notes: People & Access + My Notes + Clinic Notes + Access/Login + Contacts. Surfaces billing contact from payment settings so People isn't empty when billing contact exists.
  - Docs: Contract Vault + Key Terms + Required Items + Policies. Disclaimer visually secondary.

## Brief Tab (cheat sheet, fixed order)
1. Next Shift — next date, time, rate type, count this month, "View Schedule" link.
2. Needs Attention — specific items only when present: Confirmation due, No contract uploaded, Missing billing contact, No upcoming shifts, No rate set, Invoice draft ready (only if state already exists). Each row has a direct action that triggers existing flows.
3. Things to Remember — Clinic Login, Parking, Side Door / Access, EMR / PIMS, Communication preference, Other notes. Renders from existing clinic notes fields; subtle edit affordance.
4. Payment Setup — direct vs platform branches, no irrelevant direct fields for platform-paid.
5. Key Contact — name, role, email, phone, tag. Falls back to billing contact from payment settings if People is empty.
6. Recent Activity — uses existing activity data if available, otherwise omitted.

## Mobile polish
- Compact header with engagement chip.
- Short tabs (icon + label) horizontally scrollable if needed.
- Brief stack order matches above.
- Sticky bottom action bar (Add Shift / Confirm if applicable / More), padded above bottom nav.
- All tables converted to cards on mobile.

## Visual direction
Light neutral background, white cards, soft borders, rounded corners. Teal primary, green Direct chip, blue Roo/Platform chip, orange attention. Hierarchy via type weight + spacing; less badge noise. Uses existing design tokens; no hardcoded color classes.

## Guardrails / regression safety
- Existing dialogs/services for shift creation, invoice generation, confirmation send, archive/delete are reused — invoked from the new UI surfaces.
- No edits to `src/integrations/supabase/*`, edge functions, or invoice numbering logic.
- Default tab changes from current Overview → Brief; deep links pointing to old tab keys map: overview→brief, shifts→schedule, invoices|rates|billing|mileage→payment, people|notes→notes, contracts|terms|policies→docs.
- Archived filter chip only rendered when archived clinics exist (prevents empty-state confusion).

## Technical notes
- `useClinicBrief(facilityId)` composes from existing hooks (shifts, rates, contracts, contacts, billing settings, activity) — no new queries unless trivially derivable.
- Engagement detection: re-uses existing `facility.engagement_type` / billing-method fields already populating current pages.
- All copy uses "Clinic"/"Clinics" user-facing; identifiers, props, table refs stay `facility`/`facilities`.

## Out of scope
New backend logic, schema changes, new activity tracking system, calendar/timezone behavior, invoice numbering, shift creation flow internals.
