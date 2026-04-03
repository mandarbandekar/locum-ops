

# Fix "Unknown date" in Invoice Activity Timeline

## Problem

The `stripDbFields` helper in `DataContext.tsx` strips `created_at` from every database row, including `invoice_activity`. The `InvoiceTimeline` component relies on `created_at` to display timestamps. Since the field is removed before reaching the component, all dates show as "Unknown date."

## Root Cause

```typescript
// src/contexts/DataContext.tsx line 24
function stripDbFields(row: any): any {
  const { user_id, created_at, updated_at, ...rest } = row;
  return rest;  // created_at is gone
}
```

This is applied to ALL tables including `invoice_activity`, but activities specifically need `created_at` for the timeline display.

## Fix

**One file change** in `src/contexts/DataContext.tsx`:

Create a variant `stripDbFieldsKeepTimestamp` that preserves `created_at`, and use it specifically for the `invoice_activity` table in:
- `fetchAll()` (line 142) — where activities are initially loaded
- `refetchTable()` (line 114) — where activities are refreshed via realtime
- `addActivity()` (line 561) — where a new activity is inserted and added to state

The simplest approach: change `stripDbFields` to accept an optional `keepCreatedAt` flag, or just inline the destructure for activity rows to keep `created_at`.

## Scope

- **1 file**: `src/contexts/DataContext.tsx`
- **3 call sites** within that file where `invoice_activity` rows are processed
- No UI changes needed — `InvoiceTimeline` already handles `created_at` correctly when present

