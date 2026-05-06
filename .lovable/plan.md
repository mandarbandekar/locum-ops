# Typography refresh — calm, Apple-like system

## The problem

Today the app loads three families: **Manrope** (headings), **Plus Jakarta Sans** (body), and **Inter** (fallbacks). They have different x-heights, letter widths, and rhythm — that's why the dashboard feels "staggered" (numbers, labels, and headings don't sit on the same visual baseline).

## The direction

One refined sans family, used everywhere, in the spirit of SF Pro / Söhne: tight, neutral, calm. We'll use **Inter Tight** (a free, web-safe stand-in for SF Pro / Söhne — same DNA, very legible at UI sizes), and prefer the actual **system font (SF Pro on Apple, Segoe UI on Windows)** when available, so Mac users get true SF Pro.

### Font stack
```
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
"Inter Tight", "Inter", "Segoe UI", system-ui, sans-serif
```

- **Headings (`font-display`)**: same family, weight 600/700, tracking tightened (`-0.02em`).
- **Body (`font-sans`)**: same family, weight 400/500, default tracking.
- **Numbers**: enable `font-feature-settings: "tnum", "ss01", "cv11"` so dollar amounts and dates align in tables and dashboard cards (this alone fixes most of the "staggered" feeling).

## Changes

1. **`src/index.css`**
   - Replace the Google Fonts `@import` with one for `Inter Tight` (weights 400, 500, 600, 700) only.
   - Update `body` and `h1–h6` rules to use the new stack.
   - Add global `font-feature-settings` for tabular numerals + smoothing (`-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`).
2. **`tailwind.config.ts`**
   - `fontFamily.sans` and `fontFamily.display` both point at the new stack.
   - Add a `tracking-tight` default for `font-display` via a small `@layer base` rule so headings get `-0.02em` automatically.
3. **No component changes.** Every `font-display` / default body usage just inherits the new stack. Dashboard, sidebar, login, dialogs all update at once.

## What stays the same

- Color tokens, spacing, radii, the flat no-shadow aesthetic — all untouched.
- Existing `text-2xl`, `font-semibold`, etc. classes keep working.

## Why this fixes the "staggered" look

- One family = consistent x-height across headings, body, numbers, and labels.
- Tabular numerals = the COMPLETED / INVOICED / DUE SOON cards line up to the cent.
- Tighter heading tracking = section titles like "Money Pipeline" feel composed instead of loose.

## Out of scope

- No new font weights or italic styles beyond what we already use.
- No marketing/landing page typography overhaul (it inherits automatically; we can revisit if you want a more editorial feel there).
