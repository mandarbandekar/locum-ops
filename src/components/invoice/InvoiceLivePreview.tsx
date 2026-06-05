import { InvoicePreview, type PreviewEditableField } from './InvoicePreview';
import type { ShiftLike } from '@/lib/lineItemHours';
import { Badge } from '@/components/ui/badge';

interface Props {
  profile: any;
  facility: any;
  billingNameTo: string;
  billingEmailTo: string;
  invoice: any;
  items: any[];
  previewInvoiceNumber: string;
  previewInvoiceDate: string;
  previewDueDate: string | null;
  previewNotes: string;
  previewTotal: number;
  previewBalanceDue: number;
  computedStatus: string;
  /** When true, fields on the preview become click-to-edit. */
  editable?: boolean;
  /** Called when a preview field is committed. Pass null to clear an override. */
  onFieldChange?: (field: PreviewEditableField, value: string | null) => void | Promise<void>;
  shiftsById?: Record<string, ShiftLike | undefined> | null;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-primary/10 text-primary border-primary/20',
  partial: 'bg-warning/10 text-warning border-warning/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  paid: 'bg-success/10 text-success border-success/20',
};

export function InvoiceLivePreview(props: Props) {
  const {
    profile, facility, billingNameTo, billingEmailTo, invoice,
    items,
    previewInvoiceNumber, previewInvoiceDate, previewDueDate,
    previewNotes, previewTotal, previewBalanceDue, computedStatus,
    editable, onFieldChange, shiftsById,
  } = props;

  const statusLabel = computedStatus.charAt(0).toUpperCase() + computedStatus.slice(1);

  // Collect override values stored on the invoice row.
  const overrides: Partial<Record<PreviewEditableField, string | null>> = {
    sender_company: invoice?.sender_company_override ?? null,
    sender_name: invoice?.sender_name_override ?? null,
    sender_address: invoice?.sender_address_override ?? null,
    sender_email: invoice?.sender_email_override ?? null,
    sender_phone: invoice?.sender_phone_override ?? null,
    billto_facility_name: invoice?.billto_facility_name_override ?? null,
    billto_contact_name: invoice?.billto_contact_name_override ?? null,
    billto_email: invoice?.billto_email_override ?? null,
    billto_address: invoice?.billto_address_override ?? null,
  };

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-2 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3 px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">Preview</h2>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_TONE[computedStatus] || ''}`}>
            {statusLabel}
          </Badge>
        </div>
        <span className="hidden sm:inline text-[10px] text-muted-foreground shrink-0">
          {editable ? 'Click any field to edit' : 'Updates in real-time'}
        </span>
      </div>

      <div className="rounded-lg overflow-hidden">
        <InvoicePreview
          sender={{
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            company: profile?.company_name || '',
            address: profile?.company_address || '',
            email: profile?.invoice_email,
            phone: profile?.invoice_phone,
          }}
          billTo={{
            facilityName: facility?.name || 'Unknown',
            contactName: billingNameTo || undefined,
            email: billingEmailTo,
            address: facility?.address,
          }}
          invoiceNumber={previewInvoiceNumber}
          invoiceDate={previewInvoiceDate}
          dueDate={previewDueDate}
          lineItems={items}
          total={previewTotal}
          balanceDue={previewBalanceDue}
          notes={previewNotes}
          isPaid={computedStatus === 'paid'}
          paidAt={invoice?.paid_at}
          overrides={overrides}
          editable={editable}
          onFieldChange={onFieldChange}
        />
      </div>
    </div>
  );
}
