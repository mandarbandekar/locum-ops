

# Global Design Refresh — Color Theme Update

## Overview
Replace the current cool teal/sage palette with the new teal ramp, coral accent, and warm gray system. Changes are limited to two files: `src/index.css` (CSS variables) and `tailwind.config.ts` (brand color tokens). No component logic changes.

## Color Conversions (hex → HSL)

**New primary teal ramp:**
- primary-50 #E1F5EE → 155 55% 92%
- primary-100 #9FE1CB → 155 52% 75%
- primary-200 #5DCAA5 → 155 50% 58%
- primary-400 #1D9E75 → 155 69% 37%
- primary-600 #0F6E56 → 160 75% 25%
- primary-800 #085041 → 160 82% 17%

**Accent/CTA coral:** #D85A30 → 16 65% 52%

**Warm grays:**
- Background #F1EFE8 → 40 22% 93%
- Border #B4B2A9 → 44 6% 68%

## Changes

### `src/index.css`
**Light theme `:root`:**
- `--background` → `40 22% 93%` (warm gray #F1EFE8)
- `--primary` → `155 69% 37%` (primary-400 #1D9E75, the main interactive color)
- `--primary-foreground` → stays `0 0% 100%`
- `--secondary` → `40 18% 96%` (slightly lighter warm gray)
- `--secondary-foreground` → keep current
- `--muted` → `40 18% 96%`
- `--accent` → `40 18% 96%`
- `--accent-foreground` → `16 65% 52%` (coral for accent text)
- `--border` → `44 6% 68%` (#B4B2A9)
- `--border-soft` → `40 14% 88%`
- `--input` → `44 6% 68%`
- `--ring` → `155 69% 37%`
- `--sidebar-primary` → `155 69% 37%`
- `--sidebar-ring` → `155 69% 37%`

**Dark theme `.dark`:**
- `--primary` → `155 50% 58%` (primary-200 for dark mode visibility)
- `--accent-foreground` → `16 55% 60%` (lighter coral for dark)
- `--border` → warm-shifted dark: `35 10% 20%`
- `--input` → match border
- `--ring` → `155 50% 58%`
- `--sidebar-primary` → `155 50% 58%`
- `--sidebar-ring` → `155 50% 58%`

### `tailwind.config.ts`
Update the brand color block:
```typescript
teal: {
  50: "#E1F5EE",
  100: "#9FE1CB",
  200: "#5DCAA5",
  400: "#1D9E75",
  500: "#1D9E75", // alias for existing teal-500 references
  600: "#0F6E56",
  700: "#085041",
  800: "#085041",
},
coral: {
  DEFAULT: "#D85A30",
  500: "#D85A30",
},
```
Remove old `sage` and `navy` entries (or update to warm equivalents).

### Existing `bg-teal-500` references
The `teal.500` key in the Tailwind config maps to the new `#1D9E75`, so existing shift color dot references (`bg-teal-500`) automatically pick up the new value with no component changes needed.

## Files Modified
- `src/index.css` — CSS variable values only
- `tailwind.config.ts` — brand color hex values only

## No component, layout, or logic changes
