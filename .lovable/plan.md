

# Update Workflow Hint Labels

**What changes**: Update the step labels in `src/components/invoice/InvoiceWorkflowHint.tsx` to be more descriptive:

| Current | Updated |
|---------|---------|
| Auto-Generated | Auto-Generated Upcoming Invoices |
| Review & Send | Review & Send |
| Send to Facility | Sent to Facility |
| Awaiting Payment | Awaiting Payment |
| Record Payment | Record Payment |
| Paid | Paid |

The first step changes from "Auto-Generated" to "Auto-Generated Upcoming Invoices" to clarify that auto-generated invoices start as upcoming/future items before becoming actionable.

**File**: `src/components/invoice/InvoiceWorkflowHint.tsx` — update the `steps` array label for step 1.

