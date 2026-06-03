## My Notes — clinic journal with tags

Add a new section at the top of the facility detail page, above Clinic Notes, where the vet can keep a private rolling journal about working at the clinic — what they liked, what to watch out for, staff quirks, anything they want to remember next visit.

### Shape

- One rolling note per clinic (single editable textarea, just like Clinic Notes).
- A row of quick tags above the textarea that the vet can toggle on/off to characterize the clinic at a glance.
- Same card visual language as Clinic Notes (flat, themed border, Edit / Save / Cancel).

### Tags (toggleable chips)

Curated, opinionated set so it stays useful rather than freeform chaos:

**Positives**
- Friendly staff
- Well-equipped
- Organized records
- Reasonable caseload
- Good lunch break
- Pays on time

**Watch-outs**
- Understaffed
- Heavy caseload
- Clunky PIMS
- Disorganized
- Slow payer
- Poor handoff

Tags render as pill toggles using the existing status-pill colors (positives in success tone, watch-outs in warning tone). Empty state shows "Tap to tag your experience."

### Journal field

Single multi-line textarea with placeholder:
"What stood out this visit? What would future-you want to know before coming back?"

No timestamps, no per-shift entries — it's a living note the vet edits over time.

### Placement

Renders as the first card in the right column of the facility detail page, directly above `ClinicNotesCard`. Empty state mirrors Clinic Notes: a single-line CTA "Add notes about your experience here" that opens edit mode.

### Technical notes

- New columns on `facilities`: `experience_notes text`, `experience_tags text[] default '{}'`.
- New component `src/components/facilities/ClinicExperienceCard.tsx` modeled on `ClinicNotesCard.tsx` — same edit/save/cancel pattern, calls the existing `onUpdate(facility)` handler so it flows through the facility's existing update path (no new hook needed).
- Tag list lives as a const in the component (not in DB) so we can iterate copy without migrations.
- Add the card to `FacilityDetailPage.tsx` above the existing `<ClinicNotesCard />`.

### Out of scope

- No per-shift log entries.
- No privacy callout copy (neutral framing).
- No surfacing of tags elsewhere yet (Clinic Scorecard integration can come later if useful).
