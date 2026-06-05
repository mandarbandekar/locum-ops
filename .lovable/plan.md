## Change App Font to Inter

The app is already configured to use Inter in `src/index.css` (imported via Google Fonts) and `tailwind.config.ts` (set as the `sans` and `display` font family). However, `index.html` currently preloads **Plus Jakarta Sans** instead of Inter.

### Change
Replace the Google Fonts `<link>` in `index.html` to load Inter with weights 400, 500, 600, and 700 — matching the `@import` already defined in `src/index.css`.

**File:** `index.html`
- Replace: `family=Plus+Jakarta+Sans:wght@400;500`
- With: `family=Inter:wght@400;500;600;700`

This ensures the browser preloads the correct font file and eliminates the unused Plus Jakarta Sans request.