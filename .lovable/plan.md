# Rate Card — Mobile UX Refresh

The Rate Card screen on mobile today stacks four full-width controls per rate (shift type, rate name, amount, trash) with no visual grouping, so even 3 rates fill the screen and feel like a wall of inputs. The "Suggest types" banner, "Overtime rate" card, and "Always use Rate Card" card each live in separate cards, multiplying scroll. This plan tightens the rate rows into compact cards, consolidates preferences, and trims chrome — desktop is unchanged.

## UX

**Page intro (mobile only)**
- Keep "Rate Card" title (already provided by `page-title`).
- Drop the long paragraph; replace with one line: "Defaults for new shifts. Clinic rates always win."
- Per Day / Per Hour segmented control stays at the top but becomes a true pill segmented control (full width, two segments, active = filled primary).

**Rate row → compact rate card**
Each rate renders as a single card (rounded, themed border, no shadow), two lines:

```
┌─────────────────────────────────────────────┐
│  Weekend Day                       $ 1,100  │  ← name input (borderless) · amount (right, large)
│  ────────────────────────────────────────── │
│  [ Weekend ▾ ]                           🗑  │  ← shift-type pill select · ghost trash
└─────────────────────────────────────────────┘
```

- Name: borderless input, 16px, placeholder "Name this rate".
- Amount: borderless number input, right-aligned, 18px semibold, `$` prefix, `/day` or `/hr` suffix muted.
- Shift type: small pill-style Select (auto width, chevron). Untagged renders as muted "Add shift type" pill.
- Trash: ghost icon, right side, only confirms via swift tap (no extra modal).
- Inline error appears below the offending field in destructive color (unchanged behavior).

**List**
- Cards separated by 8px, no outer wrapper card.
- "+ Add rate" becomes a full-width dashed button at the bottom of the list (primary text, neutral border).
- Empty state: muted single line "No rates yet — add your first one" above the Add button.

**Untagged banner**
- Collapses to a single muted row above the list: small Tag icon · "3 rates missing a shift type" · ghost "Auto-tag" link on the right. No card chrome.

**Preferences group (replaces the two trailing cards)**
A single grouped list (same rounded card pattern as the new Mobile Settings hub) with two rows:

```
┌──────────────────────────────────────────────┐
│  Overtime rate                $ [  85  ] /hr │
├──────────────────────────────────────────────┤
│  Default to Rate Card                  [⚪→●] │
│  Hides clinic rates from the shift picker.    │
└──────────────────────────────────────────────┘
```

- Rows align label left, control right, with the helper text below the label (small muted).

**Footer tip**
- The "Tip: Shift Type is optional…" paragraph is removed on mobile (covered by the inline empty-state and Auto-tag affordance).

## Desktop
- No change. The new `RateRowMobile` and `PreferencesGroupMobile` render only when `useIsMobileShell()` is true; the existing `RateSection` grid stays for ≥ md.

## Technical

Edit `src/pages/SettingsRateCardPage.tsx`:
- Detect `useIsMobileShell()` and branch at the rate-list and preferences sections.
- New local components in the same file:
  - `RateCardMobile` — renders the per-rate card described above; reuses existing `onUpdate` / `onRemove` handlers and existing error state. No changes to validation, autosave, or data model.
  - `PreferencesGroupMobile` — renders Overtime + Default to Rate Card rows using the same `updateProfile` calls that the existing Cards make.
- Segmented Per Day / Per Hour: keep current `PREF_OPTIONS` data; restyle the buttons into a single 2-segment pill (`grid-cols-2`, rounded-full container, active segment uses `bg-primary text-primary-foreground`).
- Mobile intro paragraph and footer tip wrapped in `hidden md:block` (or branched on `isMobile`).
- Untagged banner: when `isMobile`, render the slim variant.

No new files. No schema changes. No changes to `onboardingRateMapping`, autosave timing, or the desktop `RateSection` component.

## Out of scope
- Desktop Rate Card layout, copy, or behavior.
- Validation rules, autosave debounce, rate model, shift-type list.
- Bulk edit, drag-to-reorder, or import/export of rates.
