

## Plan: Improve Facility Detail Page UX

### Current issues
- 6 tabs is too many — Tech Access and Clinic Access are low-traffic, single-field tabs that fragment the experience
- The Overview tab has a lot of cards but the layout could be better organized with clearer grouping
- Details card has minimal info (status, timezone, notes) that could be denser

### Changes

**1. Merge Tech Access + Clinic Access into a single "Clinic Notes" card on the Overview tab**
- Remove the `tech-access` and `clinic-access` tabs entirely (reduce from 6 tabs to 4: Overview, Shifts, Invoices, Contracts)
- Create a new `ClinicNotesCard` component that combines all 4 fields (Computer/Login, WiFi, PIMS, General Access) into a single card with labeled sections
- In read mode: show each section as a compact labeled block (icon + label + text), hiding empty sections with a subtle "Add info" link
- In edit mode: expand all fields inline with textareas
- Place this card on the Overview tab in the left column, below Shift Rates

**2. Reorganize Overview tab layout**
- Left column: Details → Shift Rates → Clinic Notes (new combined card) → Mileage from Home
- Right column: Invoicing Preferences → Scheduling/Confirmation Settings → Upcoming Shifts
- This groups "about the clinic" on the left and "operational settings" on the right

**3. Minor density improvements**
- Move Mileage from Home from right column to left column (it's clinic-specific info, not a setting)

### Files modified
- `src/pages/FacilityDetailPage.tsx` — remove 2 tab triggers/contents, merge TechAccessTab + ClinicAccessTab into a ClinicNotesCard, reorder Overview cards

