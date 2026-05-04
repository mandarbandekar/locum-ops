import { InvoicePreview } from './InvoicePreview';
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
    profile, facility, billingNameTo, billingEmailTo,
    items,
    previewInvoiceNumber, previewInvoiceDate, previewDueDate,
    previewNotes, previewTotal, previewBalanceDue, computedStatus,
  } = props;

  const statusLabel = computedStatus.charAt(0).toUpperCase() + computedStatus.slice(1);

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Preview</h2>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_TONE[computedStatus] || ''}`}>
            {statusLabel}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">Updates in real-time</span>
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
        />
      </div>
    </div>
  );
}
