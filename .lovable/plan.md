## Custom tags for My Notes

Let vets add their own tags under both "What went well" and "Watch-outs", alongside the curated presets.

### UX

In edit mode, each tag group gets a small inline "+ Add tag" affordance at the end of the chip row:

- Clicking it reveals a compact input + Enter to confirm (Esc to cancel).
- New custom tag immediately appears as an active chip in that group, styled identically to presets (emerald for positive, amber for watch-out).
- Max length ~30 chars, trim whitespace, dedupe case-insensitively against existing tags in that group.

In view mode, custom tags render the same as preset tags. Tone is determined by which group they belong to (not by membership in the preset list).

### Data

Tags currently live as a flat `experience_tags text[]` and the component infers tone by checking membership in the `POSITIVE_TAGS` preset list. That breaks for custom tags. Switch to two array columns:

- `experience_positive_tags text[]`
- `experience_watchout_tags text[]`

Migration also backfills any existing values from `experience_tags` into the correct bucket based on the current preset lists, then keeps `experience_tags` around (untouched, no longer written) for safety — we can drop it later.

### Files

- New migration: add the two columns, backfill from `experience_tags`.
- `src/components/facilities/ClinicExperienceCard.tsx`: split state into `positiveTags` / `watchoutTags`, render presets + custom together per group, add inline "Add tag" input per group, save both arrays through `onUpdate`.

### Out of scope

- No tag management UI (rename/delete custom tags globally).
- No cross-clinic tag reuse / autocomplete.
- No surfacing of tags in Clinic Scorecard yet.
