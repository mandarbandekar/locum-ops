# Switch typography to Inter

Replace the current Apple-style system font stack with **Inter** as the primary typeface across the app, keeping all existing size/tracking/leading rules from the Apple-like type ramp intact.

## Changes

1. **`src/index.css`**
   - Update the Google Fonts `@import` to load `Inter` (weights 400, 500, 600, 700) instead of `Inter Tight`.
   - Update the `html` `font-family` to:
     `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
   - Keep `font-feature-settings: 'ss01', 'cv11'` (valid Inter stylistic sets) and existing letter-spacing on headings.

2. **`tailwind.config.ts`**
   - Update `fontFamily.sans` and `fontFamily.display` to lead with `'Inter'` and the same fallback stack.

No component-level changes required — every surface inherits via `font-family: inherit`. After the swap, you'll see Inter applied uniformly across Dashboard, Clinics, Invoices, dialogs, tables, sidebar, and forms while spacing/sizes stay identical.