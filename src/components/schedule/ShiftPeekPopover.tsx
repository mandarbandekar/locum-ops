import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHIFT_COLORS, Facility } from '@/types';
import { formatTimeInTz, formatDateInTz } from '@/lib/tzTime';
import { computeInvoiceStatus } from '@/lib/businessLogic';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface ShiftPeekPopoverProps {
  shift: any | null;
  facilities: Facility[];
  invoices: any[];
  lineItems: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ShiftPeekPopover({
  shift, facilities, invoices, lineItems, open, onOpenChange, onEdit, onDelete,
}: ShiftPeekPopoverProps) {
  if (!shift) return null;

  const facility = facilities.find(f => f.id === shift.facility_id);
  const tz = facility?.timezone || BROWSER_TZ;
  const colorDef =
    SHIFT_COLORS.find(c => c.value === (shift.color || 'blue')) || SHIFT_COLORS[0];

  const dateLabel = formatDateInTz(shift.start_datetime, tz, 'EEE, MMM d, yyyy');
  const startLabel = formatTimeInTz(shift.start_datetime, tz);
  const endLabel = formatTimeInTz(shift.end_datetime, tz);

  // Linked invoice (if any)
  const linkedInvoiceId = lineItems.find(li => li.shift_id === shift.id)?.invoice_id;
  const linkedInvoice = linkedInvoiceId
    ? invoices.find(i => i.id === linkedInvoiceId)
    : null;
  const invoiceStatus = linkedInvoice ? computeInvoiceStatus(linkedInvoice) : null;
  const statusLabel = invoiceStatus
    ? invoiceStatus === 'paid'
      ? 'Paid'
      : invoiceStatus === 'overdue'
      ? 'Overdue'
      : invoiceStatus === 'partial'
      ? 'Partially paid'
      : invoiceStatus === 'sent'
      ? 'Invoiced'
      : 'Draft invoice'
    : 'Not invoiced';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-left pr-6">
            <span className={`h-3 w-3 rounded-full ${colorDef.bg} mt-1.5 shrink-0`} aria-hidden />
            <span className="break-words min-w-0">{facility?.name || 'Unknown clinic'}</span>
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground text-left">{dateLabel}</p>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px] mt-1">
          <dt className="text-muted-foreground">Time</dt>
          <dd className="font-medium">{startLabel} – {endLabel}</dd>

          <dt className="text-muted-foreground">Earnings</dt>
          <dd className="font-medium">
            ${Number(shift.rate_applied || 0).toLocaleString()}
            {shift.rate_kind === 'hourly' && shift.hourly_rate ? (
              <span className="ml-1 text-muted-foreground">(${shift.hourly_rate}/hr)</span>
            ) : null}
          </dd>

          {(shift.overtime_hours || 0) > 0 && (shift.overtime_rate || 0) > 0 && (
            <>
              <dt className="text-muted-foreground">Overtime</dt>
              <dd className="font-medium">
                {shift.overtime_hours}h · ${Math.round(Number(shift.overtime_hours) * Number(shift.overtime_rate))}
              </dd>
            </>
          )}

          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">
            {linkedInvoice ? (
              <Link
                to={`/invoices/${linkedInvoice.id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {statusLabel} <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              statusLabel
            )}
          </dd>
        </dl>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
          <Button size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
