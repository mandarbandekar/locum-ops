import type { Shift, Invoice, InvoiceLineItem } from '@/types';

/**
 * Returns eligible shifts for bulk invoicing and shifts excluded because they're in draft invoices.
 * Excludes shifts already tied to sent/partial/paid/overdue invoices.
 * Excludes shifts already tied to other draft invoices (returned separately).
 */
export function getEligibleShiftsForBulkInvoice(
  allShifts: Shift[],
  allInvoices: Invoice[],
  allLineItems: InvoiceLineItem[],
  facilityId: string,
  periodStart: Date,
  periodEnd: Date
): { eligible: Shift[]; draftExcluded: Shift[] } {
  // Find shift IDs already on non-draft invoices (sent, partial, paid, overdue)
  const nonDraftInvoiceIds = new Set(
    allInvoices
      .filter(inv => inv.status !== 'draft')
      .map(inv => inv.id)
  );
  const shiftIdsOnNonDraft = new Set(
    allLineItems
      .filter(li => li.shift_id && nonDraftInvoiceIds.has(li.invoice_id))
      .map(li => li.shift_id!)
  );

  // Find shift IDs already on draft invoices
  const draftInvoiceIds = new Set(
    allInvoices
      .filter(inv => inv.status === 'draft')
      .map(inv => inv.id)
  );
  const shiftIdsOnDraft = new Set(
    allLineItems
      .filter(li => li.shift_id && draftInvoiceIds.has(li.invoice_id))
      .map(li => li.shift_id!)
  );

  const periodStartTime = periodStart.getTime();
  const periodEndTime = new Date(periodEnd.getTime() + 86400000 - 1).getTime(); // end of day

  const eligibleFacilityShifts = allShifts.filter(s => {
    if (s.facility_id !== facilityId) return false;
    if (s.status === 'canceled' || s.status === 'proposed') return false;
    const shiftStart = new Date(s.start_datetime).getTime();
    return shiftStart >= periodStartTime && shiftStart <= periodEndTime;
  }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const eligible: Shift[] = [];
  const draftExcluded: Shift[] = [];

  for (const s of eligibleFacilityShifts) {
    if (shiftIdsOnNonDraft.has(s.id)) continue; // fully excluded
    if (shiftIdsOnDraft.has(s.id)) {
      draftExcluded.push(s);
    } else {
      eligible.push(s);
    }
  }

  return { eligible, draftExcluded };
}
