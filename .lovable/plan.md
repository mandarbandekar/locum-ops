

## Adopt new LocumOps logo across the app

### What changes

Replace the current placeholder brand marks (a square with the letter "L" plus the text "LocumOps") with the uploaded **LocumOps logo lockup** (teal seedling icon + dark teal wordmark) wherever the brand appears.

### Asset

Save the uploaded image to the project as a single reusable asset:

- `src/assets/locumops-logo.png` — **overwrite** the existing file (already imported by `AppSidebar.tsx`, so the sidebar picks up the new mark automatically) with the new full lockup (icon + wordmark).

The image is a horizontal lockup with built-in spacing, so we render it as one `<img>` and drop the separate text label next to it.

### Files updated

1. **`src/pages/WelcomePage.tsx`** — Replace the "L" tile + "Locum Ops" text block (lines ~63–68) with a single centered `<img src={locumOpsLogo} alt="LocumOps" className="h-10 w-auto" />`. Add the import.

2. **`src/pages/LoginPage.tsx`** — Replace the "L" tile + "LocumOps" text block (lines ~91–96) with `<img src={locumOpsLogo} alt="LocumOps" className="h-8 w-auto mb-6" />`. Add the import. The two body references to "LocumOps" in the heading/sub-copy stay (they're sentences, not the logo).

3. **`src/components/AppSidebar.tsx`** — No code change needed; it already renders `locumOpsLogo`. The new image will flow through automatically once the asset is overwritten. (Sidebar already sizes the mark for collapsed/expanded states.)

### Out of scope

- Favicon (`public/favicon.png`) — leave as-is unless you want it updated; can be a follow-up.
- Marketing landing page (`LandingPage.tsx`) navbar — currently uses its own treatment; flag for a separate pass if you want the lockup there too.
- The string "LocumOps" inside body copy, emails, and disclaimers stays — it's product naming, not a logo.

### Verification

- `/welcome` shows the new horizontal logo lockup centered above the signup form, no more "L" square.
- `/login` shows the new lockup top-left of the form column.
- Sidebar (expanded) shows the new lockup; collapsed state remains visually balanced.
- No broken image references; no leftover "L" tiles.

