import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InvoicePreview } from './InvoicePreview';
import { Download, FileText, Mail, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  // Sender / Bill-to
  profile: any;
  facility: any;
  billingNameTo: string;
  billingEmailTo: string;
  // Invoice fields (live)
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
    invoice, items,
    previewInvoiceNumber, previewInvoiceDate, previewDueDate,
    previewNotes, previewTotal, previewBalanceDue, computedStatus,
  } = props;

  const [tab, setTab] = useState<'pdf' | 'email' | 'link'>('pdf');

  const senderCompany = profile?.company_name?.trim()
    || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
    || 'Your relief veterinarian';

  const senderEmail = profile?.invoice_email || '';

  const dueDateFormatted = useMemo(() => {
    if (!previewDueDate) return '';
    const m = previewDueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (m) return `${MONTHS[parseInt(m[2],10)-1]} ${parseInt(m[3],10)}, ${m[1]}`;
    return '';
  }, [previewDueDate]);

  const totalFormatted = previewBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const subject = `Invoice ${previewInvoiceNumber} from ${senderCompany}`;
  const greetingName = billingNameTo?.trim() || 'there';
  const signOffName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || senderCompany;
  const company = profile?.company_name?.trim();

  const previewComponent = (
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
  );

  const statusLabel = computedStatus.charAt(0).toUpperCase() + computedStatus.slice(1);
  const hasShareToken = !!invoice?.share_token && !invoice?.share_token_revoked_at;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Preview</h2>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_TONE[computedStatus] || ''}`}>
            {statusLabel}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">Updates in real-time</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-1">
          <TabsTrigger
            value="pdf"
            className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-3 py-2 text-xs font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            Invoice PDF
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-3 py-2 text-xs font-medium"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger
            value="link"
            className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-3 py-2 text-xs font-medium"
          >
            <Link2 className="h-3.5 w-3.5" />
            Public link
          </TabsTrigger>
        </TabsList>

        {/* PDF tab */}
        <TabsContent value="pdf" className="mt-4">
          <div className="rounded-lg overflow-hidden">
            {previewComponent}
          </div>
        </TabsContent>

        {/* Email tab */}
        <TabsContent value="email" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Email header */}
            <div className="border-b border-border px-4 py-3 space-y-1.5 bg-muted/30">
              <div className="flex gap-2 text-xs">
                <span className="w-14 text-muted-foreground shrink-0">From</span>
                <span className="text-foreground font-medium truncate">
                  {senderCompany}{senderEmail ? ` <${senderEmail}>` : ''}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="w-14 text-muted-foreground shrink-0">To</span>
                <span className="text-foreground truncate">
                  {billingEmailTo
                    ? `${billingNameTo ? `${billingNameTo} ` : ''}<${billingEmailTo}>`
                    : <span className="text-muted-foreground italic">Add a billing email to preview the recipient</span>}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="w-14 text-muted-foreground shrink-0">Subject</span>
                <span className="text-foreground font-semibold truncate">{subject}</span>
              </div>
            </div>
            {/* Email body */}
            <div className="px-6 py-6 text-sm text-foreground">
              <p className="mb-3">Hi {greetingName},</p>
              <p className="mb-3">
                Please find attached invoice <span className="font-semibold">{previewInvoiceNumber}</span> for relief
                coverage at {facility?.name || 'your facility'}. Total due: <span className="font-semibold">${totalFormatted}</span>
                {dueDateFormatted ? `, by ${dueDateFormatted}` : ''}.
              </p>
              <p className="mb-5">You can view and download the invoice using the link below.</p>
              <div className="my-5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  View invoice
                </span>
              </div>
              <p className="mb-1">Thanks,</p>
              <p className="font-medium">{signOffName}</p>
              {company && <p className="text-muted-foreground">{company}</p>}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            This is what your clinic will see in their inbox.
          </p>
        </TabsContent>

        {/* Public link tab */}
        <TabsContent value="link" className="mt-4">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-foreground truncate">
                Invoice {previewInvoiceNumber}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-70">
                <Download className="h-3 w-3" />
                Download PDF
              </span>
            </div>
            <div className="rounded-lg overflow-hidden">
              {previewComponent}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {hasShareToken
              ? 'This is what anyone with the share link will see.'
              : 'Generate a share link from the action bar to share publicly — preview shown above.'}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
