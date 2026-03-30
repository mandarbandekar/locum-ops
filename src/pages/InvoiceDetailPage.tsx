import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2, AlertTriangle, Download, Loader2, ArrowRight, Layers, Send, CheckCircle } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { InvoiceStepper } from '@/components/invoice/InvoiceStepper';
import { ReadyToSendChecklist, buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { InvoiceTimeline } from '@/components/invoice/InvoiceTimeline';
import { InvoiceDraftEditor } from '@/components/invoice/InvoiceDraftEditor';
import { InvoiceSentActions } from '@/components/invoice/InvoiceSentActions';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invoice-pdf?invoice_id=${encodeURIComponent(invoiceId)}`;
  const res = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
  });
  if (!res.ok) throw new Error('Failed to generate PDF');
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${invoiceNumber || 'invoice'}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', color: 'text-muted-foreground' },
  sent: { label: 'Sent', variant: 'default', color: 'text-blue-600 dark:text-blue-400' },
  partial: { label: 'Partial', variant: 'outline', color: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Overdue', variant: 'destructive', color: 'text-destructive' },
  paid: { label: 'Paid', variant: 'default', color: 'text-primary' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, lineItems, facilities, contacts, payments, activities, updateInvoice, deleteInvoice, addLineItem, updateLineItem, deleteLineItem, addPayment, addActivity, updateFacility } = useData();
  const { profile } = useUserProfile();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const invoice = invoices.find(i => i.id === id);
  if (!invoice) return <div className="p-6">Invoice not found. <Button variant="link" onClick={() => navigate('/invoices')}>Back</Button></div>;

  const items = lineItems.filter(li => li.invoice_id === id);
  const facility = facilities.find(c => c.id === invoice.facility_id);
  const billingNameTo = facility?.invoice_name_to || '';
  const billingEmailTo = (invoice as any).billing_email_to || facility?.invoice_email_to || '';
  const invoicePayments = payments.filter(p => p.invoice_id === id);
  const invoiceActivities = activities.filter(a => a.invoice_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const computedStatus = computeInvoiceStatus(invoice);
  const isDraft = invoice.status === 'draft';
  const statusConfig = STATUS_CONFIG[computedStatus] || STATUS_CONFIG.draft;

  const handleDelete = async () => {
    await deleteInvoice(invoice.id);
    toast.success('Invoice deleted');
    navigate('/invoices');
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF generation failed');
    } finally {
      setPdfLoading(false);
    }
  };

  // Due date helper
  const dueDaysText = invoice.due_date && computedStatus !== 'paid'
    ? (() => {
        const days = differenceInCalendarDays(new Date(invoice.due_date), new Date());
        if (days < 0) return `${Math.abs(days)}d overdue`;
        if (days === 0) return 'Due today';
        return `Due in ${days}d`;
      })()
    : null;

  return (
    <div className="pb-24 lg:pb-6">
      {/* ─── Compact Header ─── */}
      <div className="flex items-start gap-3 mb-5 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">{invoice.invoice_number}</h1>
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.label}
            </Badge>
            {(invoice as any).invoice_type === 'bulk' && (
              <Badge variant="outline" className="text-xs"><Layers className="h-2.5 w-2.5 mr-0.5" />Bulk</Badge>
            )}
            {(invoice as any).generation_type === 'automatic' && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">Auto</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{facility?.name}</span>
            <span>·</span>
            <span className="font-semibold text-foreground">${invoice.total_amount.toLocaleString()}</span>
            {dueDaysText && (
              <>
                <span>·</span>
                <span className={computedStatus === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {dueDaysText}
                </span>
              </>
            )}
          </div>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {invoice.invoice_number}?</AlertDialogTitle>
              <AlertDialogDescription>This permanently deletes the invoice and all line items.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ─── Stepper ─── */}
      <div className="mb-6 max-w-xl print:hidden">
        <InvoiceStepper status={computedStatus} />
      </div>

      {/* ─── Overdue Banner ─── */}
      {computedStatus === 'overdue' && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 flex items-center gap-2.5 print:hidden">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Overdue — was due {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}.
          </p>
        </div>
      )}

      {/* ─── Main Layout: Preview (hero) + Side Panel ─── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT: Invoice Preview — the hero */}
        <div className="lg:col-span-3 space-y-4" id="invoice-print-area">
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
            invoiceNumber={invoice.invoice_number}
            invoiceDate={invoice.invoice_date}
            dueDate={invoice.due_date}
            lineItems={items}
            total={invoice.total_amount}
            balanceDue={invoice.balance_due}
            notes={invoice.notes}
          />

          {/* Activity Timeline - below preview */}
          {invoiceActivities.length > 0 && (
            <div className="bg-card border rounded-xl p-5 print:hidden">
              <InvoiceTimeline events={invoiceActivities} />
            </div>
          )}
        </div>

        {/* RIGHT: Contextual Side Panel */}
        <div className="lg:col-span-2 print:hidden">
          {isDraft ? (
            <DraftSidePanel
              invoice={invoice}
              items={items}
              facility={facility}
              profile={profile}
              billingNameTo={billingNameTo}
              billingEmailTo={billingEmailTo}
              onUpdateInvoice={updateInvoice}
              onAddLineItem={addLineItem}
              onUpdateLineItem={updateLineItem}
              onDeleteLineItem={deleteLineItem}
              onAddActivity={addActivity}
              onOpenBillingDialog={() => setBillingDialogOpen(true)}
              onDownloadPdf={handleDownloadPdf}
              pdfLoading={pdfLoading}
            />
          ) : (
            <InvoiceSentActions
              invoice={invoice}
              items={items}
              invoicePayments={invoicePayments}
              facility={facility}
              billingNameTo={billingNameTo}
              onUpdateInvoice={updateInvoice}
              onAddPayment={addPayment}
              onAddActivity={addActivity}
            />
          )}
        </div>
      </div>

      {/* ─── Mobile Sticky Action Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 flex gap-2 lg:hidden print:hidden z-40">
        {isDraft ? (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadPdf} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <Button size="sm" className="flex-[3]">
              <CheckCircle className="mr-2 h-4 w-4" /> Review & Send
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadPdf} disabled={pdfLoading}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info('Email sending coming soon!')}>
              <Send className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* ─── Billing Details Dialog ─── */}
      <BillingDetailsDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
        facility={facility}
        onSave={(updates: any) => {
          if (facility) {
            updateFacility({ ...facility, ...updates });
            toast.success('Billing contact details saved');
          }
          setBillingDialogOpen(false);
        }}
      />
    </div>
  );
}

// ─── Draft Side Panel ───────────────────────────────

function DraftSidePanel({
  invoice, items, facility, profile, billingNameTo, billingEmailTo,
  onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem,
  onAddActivity, onOpenBillingDialog, onDownloadPdf, pdfLoading,
}: any) {
  const editor = InvoiceDraftEditor({
    invoice, items, facility, profile, billingNameTo, billingEmailTo,
    onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem,
    onAddActivity, onOpenBillingDialog,
  });

  const checklist = buildChecklistItems(profile, { ...invoice, due_date: editor.dueDate || invoice.due_date }, items, facility);
  const allReady = checklist.filter(i => i.required).every(i => i.complete);

  return (
    <div className="space-y-4">
      {/* Ready-to-send checklist */}
      <ReadyToSendChecklist
        items={checklist}
        onFixBilling={onOpenBillingDialog}
      />

      {/* Edit sections */}
      <div className="bg-card border rounded-xl p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Edit Invoice</p>
        {editor.editPanel}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 hidden lg:block">
        <Button onClick={editor.handleProceedToSend} className="w-full" size="lg" disabled={!allReady}>
          <ArrowRight className="mr-2 h-4 w-4" /> Mark as Sent
        </Button>
        <div className="flex gap-2">
          <Button onClick={editor.handleSave} variant="outline" disabled={editor.saving} className="flex-1">
            {editor.saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
        <Button variant="outline" className="w-full justify-start text-xs" onClick={() => toast.info('Email sending coming soon!')} disabled={!billingNameTo || !billingEmailTo}>
          <Send className="mr-2 h-3.5 w-3.5" />
          Send to {billingNameTo || '—'} at {facility?.name || '—'}
          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Beta</Badge>
        </Button>
      </div>
    </div>
  );
}

// ─── Billing Details Dialog ─────────────────────────

function BillingDetailsDialog({ open, onOpenChange, facility, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; facility: any; onSave: (updates: any) => void }) {
  const [nameTo, setNameTo] = useState(facility?.invoice_name_to || '');
  const [emailTo, setEmailTo] = useState(facility?.invoice_email_to || '');
  const [nameCc, setNameCc] = useState(facility?.invoice_name_cc || '');
  const [emailCc, setEmailCc] = useState(facility?.invoice_email_cc || '');
  const [nameBcc, setNameBcc] = useState(facility?.invoice_name_bcc || '');
  const [emailBcc, setEmailBcc] = useState(facility?.invoice_email_bcc || '');

  const facilityId = facility?.id;
  const [lastFacilityId, setLastFacilityId] = useState(facilityId);
  if (facilityId !== lastFacilityId) {
    setLastFacilityId(facilityId);
    setNameTo(facility?.invoice_name_to || '');
    setEmailTo(facility?.invoice_email_to || '');
    setNameCc(facility?.invoice_name_cc || '');
    setEmailCc(facility?.invoice_email_cc || '');
    setNameBcc(facility?.invoice_name_bcc || '');
    setEmailBcc(facility?.invoice_email_bcc || '');
  }

  const handleSave = () => {
    onSave({
      invoice_name_to: nameTo.trim(),
      invoice_email_to: emailTo.trim(),
      invoice_name_cc: nameCc.trim(),
      invoice_email_cc: emailCc.trim(),
      invoice_name_bcc: nameBcc.trim(),
      invoice_email_bcc: emailBcc.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Billing Contact</DialogTitle>
          <DialogDescription>
            Add billing contact details for {facility?.name || 'this facility'}. Saved for all future invoices.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">To</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameTo} onChange={e => setNameTo(e.target.value)} placeholder="Billing Department" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="billing@clinic.com" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">CC</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameCc} onChange={e => setNameCc(e.target.value)} placeholder="Office Manager" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="manager@clinic.com" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">BCC</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameBcc} onChange={e => setNameBcc(e.target.value)} placeholder="Records" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailBcc} onChange={e => setEmailBcc(e.target.value)} placeholder="records@clinic.com" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!nameTo.trim() || !emailTo.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
