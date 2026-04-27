# Surface Rate Card rates inside the Add Shift flow

## What you're seeing

When you open the **Add Shift** dialog and pick a clinic, the rate dropdown only shows rates that were saved on **that clinic's terms** (e.g. its Weekday/Weekend rates). The rates you saved in **Settings → Rate Card** (GP Day, ER Day, Surgery, hourly rates, etc.) never appear — unless the clinic has *zero* rates configured.

## Why it happens

In `src/components/schedule/ShiftFormDialog.tsx`, `buildRateOptions()` does this:

```ts
if (fromFacility.length > 0) return fromFacility;     // ← stops here
return mapDefaultRatesToRateEntries(defaultRates);    // ← only used if clinic has no rates
```

So the Rate Card is treated as a **fallback**, not a **library**. For any existing user (every clinic already has at least a Weekday rate), the Rate Card is invisible inside Add Shift.

## How it should work

The Rate Card is your personal price list. When logging a shift, you should see:

1. **Facility-specific rates first** (they're the source of truth for that clinic's contract)
2. **Then your Rate Card rates** that aren't already represented on the facility — labeled so you know they're coming from your personal library, not the contract.

Selecting a Rate Card entry just pre-fills the amount + kind (flat/hourly) + shift_type for the shift. It does NOT silently mutate the facility's terms.

## Proposed changes

### 1. Merge, don't fallback (`ShiftFormDialog.tsx`)
Rewrite `buildRateOptions()` to always concatenate:
- All facility rates (existing behavior)
- Plus Rate Card entries that aren't already represented at the facility (deduped by `label + amount + kind`)

### 2. Visual grouping in the rate dropdown
Inside the rate `<Select>`, render two labeled groups:
- **From this clinic** — facility terms rates
- **From your Rate Card** — personal library entries with a small muted "Rate Card" tag

If a clinic has no terms yet, only the Rate Card group renders (current fallback behavior preserved).

### 3. Carry shift_type through
When a Rate Card option is picked, set `shift_type` on the shift from the matched entry — same as today's facility-rate path. This keeps the shift-type categorization initiative working for shifts logged via Rate Card defaults.

### 4. Empty-state hint
If both facility terms AND Rate Card are empty, show inline copy in the rate field: *"No saved rates yet — type an amount, or set defaults in Settings → Rate Card."* with a link.

## Files touched

- `src/components/schedule/ShiftFormDialog.tsx` — merge logic, grouped Select rendering, shift_type wiring, empty-state hint

## Out of scope

- No DB migrations — Rate Card already lives on `profiles.default_rates`
- No changes to facility terms persistence — Rate Card stays a personal library, not a clinic contract
- Bulk Shift Calendar already merges correctly via `buildBulkRateOptions` — no changes needed there
