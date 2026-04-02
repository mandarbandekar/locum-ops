

# Merge Create & Bulk Invoice into One Dialog

## What changes
Replace the two separate invoice creation flows (simple "Create" and "Bulk" wizard) with a single "Create Invoice" button that opens the existing `BulkInvoiceDialog` wizard. The wizard already covers the complete flow: facility → period → shift selection → review.

## Files to modify

### `src/pages/InvoicesPage.tsx`
- Remove `showBulkCreate` state and the separate "Bulk" button
- Rename `showCreate` usage to open `BulkInvoiceDialog` instead of `CreateInvoiceDialog`
- Remove the entire `CreateInvoiceDialog` function (lines 273-358)
- Remove `CreateInvoiceDialog` from both render locations (empty state + main view)
- Keep single "Create Invoice" button that opens `BulkInvoiceDialog`
- Remove unused imports (`Layers`, `subDays`, `Label`, `Input`, `Select` components only used by `CreateInvoiceDialog`)
- Update `InvoiceEmptyState` callback to open the same dialog

### `src/components/invoice/BulkInvoiceDialog.tsx`
- Rename dialog title from "Create Bulk Invoice" to "Create Invoice"
- Update success toast from "Bulk invoice created..." to "Invoice created..."

### No changes to:
- Invoice logic, status computation, auto-generation, line item handling, or any other existing functionality
- `bulkInvoiceHelpers.ts`, `DataContext.tsx`, `InvoiceStatusGroup.tsx`, or any other file

## Why this is safe
The `BulkInvoiceDialog` already does everything `CreateInvoiceDialog` does (and more). It uses `getEligibleShiftsForBulkInvoice` which properly excludes shifts on sent/paid invoices and flags draft-linked shifts. All shifts are auto-selected in step 3, so the "simple" flow is just clicking through the wizard. No invoice logic changes.

