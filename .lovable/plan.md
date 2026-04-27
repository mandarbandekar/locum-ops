## Remove number input spinner arrows everywhere

The up/down arrows on the rate input are the browser's default spinner controls on `<input type="number">`. Several inputs across the app use this type (rates, hours, mileage, expense amounts, CE hours, break minutes, etc.), so the cleanest fix is one global CSS rule rather than touching each component.

### Change

**File:** `src/index.css`

Append a small block that hides the spinner buttons in all browsers:

```css
/* Hide number input spinner arrows globally */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

### Result

- The little ▲▼ arrows disappear from every numeric input in the app (rates editor, shift form, expenses, mileage, CE hours, break minutes, tax/reports, etc.).
- Users can still type numbers normally; keyboard up/down arrow keys continue to work.
- No component logic or layout changes — purely cosmetic.
