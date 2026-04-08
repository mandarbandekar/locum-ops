

# Three UI Tweaks: Expenses Header, Tax Intelligence Rename, Amber Tax Amounts

## Changes

### 1. Add page header to Expenses & Mileage (`src/pages/ExpensesPage.tsx`)
Add a header block above the Tabs matching the style of other pages (icon + title + subtitle):
- Icon: `Receipt` (already used in sidebar)
- Title: "Expense and Mileage Tracking"
- Subtitle: "Track business expenses, mileage, and tax write-offs"

### 2. Rename "Tax Center" → "Tax Intelligence"
Two files:
- **`src/components/AppSidebar.tsx`** line 68: change sidebar label from `'Tax Center'` to `'Tax Intelligence'`
- **`src/pages/TaxCenterPage.tsx`** line 27: change `<h1>` from `"Tax Center"` to `"Tax Intelligence"`

### 3. Replace `text-destructive` with amber/warning color on tax amounts (`src/components/tax-intelligence/TaxDashboard.tsx`)
Replace all `text-destructive` on monetary tax amounts with `text-amber-500` (from the theme). This covers:
- Quarterly payment hero numbers (lines 272, 291, 298)
- Annual breakdown cards (lines 336, 342, 346)
- "Every additional $1,000" callout (line 181)
- Breakdown rows with `negative` flag (line 523)

Keep `variant="destructive"` on the "X days" urgency badges — those should stay red as they signal deadlines.

## Files

| File | Change |
|---|---|
| `src/pages/ExpensesPage.tsx` | Add page header with Receipt icon |
| `src/components/AppSidebar.tsx` | Rename sidebar item |
| `src/pages/TaxCenterPage.tsx` | Rename page title |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Swap `text-destructive` → `text-amber-500` on tax amounts |

