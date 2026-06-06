import { Card } from '@/components/ui/card';
import { EditableField } from './EditableField';
import { formatLineHours, type ShiftLike } from '@/lib/lineItemHours';

/** Format a date string to 'MMM d, yyyy' without timezone shift.
 *  Handles both 'YYYY-MM-DD' and ISO timestamps safely. */
function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return '—';
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, , m, d] = match;
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
  }
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return '—';
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

/** Convert any date-ish input to YYYY-MM-DD for a date input. */
function toDateInputValue(v: string | null | undefined): string {
  if (!v) return '';
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

/** Every editable field on the preview, keyed for onFieldChange. */
export type PreviewEditableField =
  | 'sender_company' | 'sender_name' | 'sender_address' | 'sender_email' | 'sender_phone'
  | 'billto_facility_name' | 'billto_contact_name' | 'billto_email' | 'billto_address'
  | 'invoice_number' | 'invoice_date' | 'due_date' | 'notes';

interface PreviewProps {
  sender: {
    firstName: string;
    lastName: string;
    company: string;
    address: string;
    email?: string | null;
    phone?: string | null;
  };
  billTo: {
    facilityName: string;
    contactName?: string;
    email?: string;
    address?: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  lineItems: { id?: string; description: string; service_date: string | null; qty: number; unit_rate: number; line_total: number; shift_id?: string | null; line_kind?: 'regular' | 'flat' | 'overtime' }[];
  /** Called when a line item's description is edited inline in the preview. */
  onLineItemDescriptionChange?: (itemId: string, value: string) => void | Promise<void>;
  total: number;
  balanceDue: number;
  notes: string;
  /** When true, render a "PAID" stamp overlay and show explicit Balance Due. */
  isPaid?: boolean;
  /** ISO timestamp of when the invoice was paid (for stamp date). */
  paidAt?: string | null;
  /** Per-invoice override values; key = field name, value = override (or null/undefined for none). */
  overrides?: Partial<Record<PreviewEditableField, string | null>>;
  /** When true, fields become click-to-edit. */
  editable?: boolean;
  /** Called when an editable field is committed. Pass null to clear the override. */
  onFieldChange?: (field: PreviewEditableField, value: string | null) => void | Promise<void>;
  /** Map of shift_id -> shift fields, used to render real hours worked in the Hours column. */
  shiftsById?: Record<string, ShiftLike | undefined> | null;
}

export function InvoicePreview({
  sender, billTo, invoiceNumber, invoiceDate, dueDate, lineItems, total, balanceDue, notes,
  isPaid = false, paidAt,
  overrides, editable = false, onFieldChange, shiftsById, onLineItemDescriptionChange,
}: PreviewProps) {
  const ov = overrides || {};
  const change = (f: PreviewEditableField, v: string | null) => onFieldChange?.(f, v);

  // Resolve value = override ?? source
  const senderName = `${sender.firstName} ${sender.lastName}`.trim();
  const senderCompany = ov.sender_company ?? sender.company ?? '';
  const senderNameVal = ov.sender_name ?? senderName;
  const senderAddr = ov.sender_address ?? sender.address ?? '';
  const senderEmail = ov.sender_email ?? (sender.email || '');
  const senderPhone = ov.sender_phone ?? (sender.phone || '');

  const billFacilityName = ov.billto_facility_name ?? billTo.facilityName;
  const billContact = ov.billto_contact_name ?? (billTo.contactName || '');
  const billEmail = ov.billto_email ?? (billTo.email || '');
  const billAddr = ov.billto_address ?? (billTo.address || '');

  const invNum = ov.invoice_number ?? invoiceNumber;
  const invDate = ov.invoice_date ?? invoiceDate;
  const due = ov.due_date ?? dueDate ?? '';
  const notesVal = ov.notes ?? notes;

  const isOv = (f: PreviewEditableField) => ov[f] != null;

  const totalNum = Number(total) || 0;
  const balanceNum = Number(balanceDue) || 0;
  const amountPaid = Math.max(0, totalNum - balanceNum);
  const showPaymentBreakdown = isPaid || amountPaid > 0;

  return (
    <Card className="bg-card border shadow-sm overflow-hidden relative">
      {isPaid && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center print:opacity-100"
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          <div
            className="select-none -rotate-12 opacity-80 rounded-md border-4 border-double px-6 py-2 sm:px-10 sm:py-3 text-center"
            style={{ borderColor: 'hsl(0 75% 45%)', color: 'hsl(0 75% 45%)' }}
          >
            <div className="text-4xl sm:text-6xl font-black tracking-[0.2em] leading-none">PAID</div>
            {paidAt && (
              <div className="mt-1 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
                {formatDateSafe(paidAt)}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 relative" id="invoice-preview">

        {/* Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-foreground break-words">
              <EditableField
                editable={editable} value={senderCompany} sourceValue={sender.company}
                isOverridden={isOv('sender_company')}
                onChange={v => change('sender_company', v)}
                placeholder="Your Company" ariaLabel="Edit company name"
              />
            </h2>
            <p className="text-sm text-muted-foreground">
              <EditableField
                editable={editable} value={senderNameVal} sourceValue={senderName}
                isOverridden={isOv('sender_name')}
                onChange={v => change('sender_name', v)}
                placeholder="Your name" ariaLabel="Edit sender name"
              />
            </p>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words">
              <EditableField
                editable={editable} value={senderAddr} sourceValue={sender.address}
                isOverridden={isOv('sender_address')} multiline
                onChange={v => change('sender_address', v)}
                placeholder="Add address" ariaLabel="Edit sender address"
              />
            </p>
            <p className="text-xs text-muted-foreground break-all">
              <EditableField
                editable={editable} value={senderEmail} sourceValue={sender.email || ''}
                isOverridden={isOv('sender_email')} inputType="email"
                onChange={v => change('sender_email', v)}
                placeholder="Add email" ariaLabel="Edit sender email"
              />
            </p>
            <p className="text-xs text-muted-foreground">
              <EditableField
                editable={editable} value={senderPhone} sourceValue={sender.phone || ''}
                isOverridden={isOv('sender_phone')}
                onChange={v => change('sender_phone', v)}
                placeholder="Add phone" ariaLabel="Edit sender phone"
              />
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-bold text-primary tracking-tight">INVOICE</p>
            <p className="text-xs sm:text-sm font-medium text-foreground mt-1 break-all">
              <EditableField
                editable={editable} value={invNum} sourceValue={invoiceNumber}
                isOverridden={isOv('invoice_number')}
                onChange={v => change('invoice_number', v)}
                placeholder="Invoice #" ariaLabel="Edit invoice number"
                className="text-right"
              />
            </p>
          </div>
        </div>

        {/* Bill-to + dates */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
            <p className="text-sm font-medium">
              <EditableField
                editable={editable} value={billFacilityName} sourceValue={billTo.facilityName}
                isOverridden={isOv('billto_facility_name')}
                onChange={v => change('billto_facility_name', v)}
                placeholder="Clinic name" ariaLabel="Edit bill-to clinic name"
              />
            </p>
            <p className="text-xs text-muted-foreground">
              <EditableField
                editable={editable} value={billContact} sourceValue={billTo.contactName || ''}
                isOverridden={isOv('billto_contact_name')}
                onChange={v => change('billto_contact_name', v)}
                placeholder="Add contact name" ariaLabel="Edit bill-to contact name"
              />
            </p>
            <p className="text-xs text-muted-foreground">
              <EditableField
                editable={editable} value={billEmail} sourceValue={billTo.email || ''}
                isOverridden={isOv('billto_email')} inputType="email"
                onChange={v => change('billto_email', v)}
                placeholder="Add billing email" ariaLabel="Edit bill-to email"
              />
            </p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              <EditableField
                editable={editable} value={billAddr} sourceValue={billTo.address || ''}
                isOverridden={isOv('billto_address')} multiline
                onChange={v => change('billto_address', v)}
                placeholder="Add billing address" ariaLabel="Edit bill-to address"
              />
            </p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm font-medium">
                {editable ? (
                  <EditableField
                    editable value={toDateInputValue(invDate)} sourceValue={toDateInputValue(invoiceDate)}
                    isOverridden={isOv('invoice_date')} inputType="date"
                    onChange={v => change('invoice_date', v)}
                    placeholder="—" ariaLabel="Edit invoice date"
                  />
                ) : formatDateSafe(invDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">
                {editable ? (
                  <EditableField
                    editable value={toDateInputValue(due)} sourceValue={toDateInputValue(dueDate)}
                    isOverridden={isOv('due_date')} inputType="date"
                    onChange={v => change('due_date', v)}
                    placeholder="—" ariaLabel="Edit due date"
                  />
                ) : formatDateSafe(due)}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items — table on sm+, stacked cards on mobile */}
        <div className="border rounded-md overflow-hidden">
          {/* Mobile: stacked rows */}
          <div className="sm:hidden">
            {lineItems.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">No line items</div>
            )}
            {lineItems.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>{lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}</span>
                <span>Amount</span>
              </div>
            )}
            <ul className="divide-y">
              {lineItems.map((li, i) => {
                const lt = Number(li.line_total) || 0;
                const ur = Number(li.unit_rate) || 0;
                const hoursLabel = formatLineHours(li, shiftsById);
                return (
                  <li key={i} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium leading-snug break-words text-foreground">
                          {editable && li.id && onLineItemDescriptionChange ? (
                            <EditableField
                              editable
                              value={li.description}
                              sourceValue={li.description}
                              onChange={(v) => onLineItemDescriptionChange(li.id!, (v ?? '').toString())}
                              placeholder="Description"
                              ariaLabel="Edit line item description"
                              multiline
                            />
                          ) : li.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(li.service_date) || '—'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0 text-foreground">
                        ${lt.toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                      {hoursLabel === '—' ? '—' : `${hoursLabel} hrs`} <span className="text-foreground/80">${ur.toLocaleString()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Desktop: table */}
          <table className="w-full text-sm hidden sm:table">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2.5 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground w-24">Date</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-16">Hours</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-20">Rate</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => {
                const lt = Number(li.line_total) || 0;
                const ur = Number(li.unit_rate) || 0;
                const hoursLabel = formatLineHours(li, shiftsById);
                return (
                  <tr key={i} className="border-t">
                    <td className="p-2.5">
                      {editable && li.id && onLineItemDescriptionChange ? (
                        <EditableField
                          editable
                          value={li.description}
                          sourceValue={li.description}
                          onChange={(v) => onLineItemDescriptionChange(li.id!, (v ?? '').toString())}
                          placeholder="Description"
                          ariaLabel="Edit line item description"
                          multiline
                        />
                      ) : li.description}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{formatDateShort(li.service_date)}</td>
                    <td className="p-2.5 text-right">{hoursLabel === '—' ? '—' : `${hoursLabel}h`}</td>
                    <td className="p-2.5 text-right">
                      ${ur.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">${lt.toLocaleString()}</td>
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <p className="text-[11px] text-muted-foreground -mt-2">
            Line items are edited on the left panel.
          </p>
        )}

        {/* Totals */}
        <div className="flex justify-end relative z-20">
          <div className="w-full sm:w-56 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {showPaymentBreakdown && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="tabular-nums text-success">-${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold text-base border-t pt-2 ${isPaid ? 'text-success' : ''}`}>
              <span>Balance Due</span>
              <span className={`tabular-nums ${isPaid ? 'text-success' : 'text-primary'}`}>
                ${balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>


        {/* Notes */}
        {(notesVal || editable) && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              <EditableField
                editable={editable} value={notesVal} sourceValue={notes}
                isOverridden={isOv('notes')} multiline
                onChange={v => change('notes', v)}
                placeholder="Add notes for this invoice" ariaLabel="Edit invoice notes"
              />
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
