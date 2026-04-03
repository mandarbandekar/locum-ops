import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2, AlertTriangle, Layers, Undo2, ArrowRight, Send, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { InvoiceStepper } from '@/components/invoice/InvoiceStepper';
import { ReadyToSendChecklist, buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { InvoiceTimeline } from '@/components/invoice/InvoiceTimeline';
import { InvoiceEditPanel } from '@/components/invoice/InvoiceEditPanel';
import { InvoiceSentPanel } from '@/components/invoice/InvoiceSentPanel';
import { InvoiceActionBar } from '@/components/invoice/InvoiceActionBar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  partial: { label: 'Partial', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  paid: { label: 'Paid', variant: 'default' },
};

function getStepOrder(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent' || status === 'partial' || status === 'overdue') return 1;
  if (status === 'paid') return 2;
  return 0;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, lineItems, facilities, contacts, payments, activities, updateInvoice, deleteInvoice, addLineItem, updateLineItem, deleteLineItem, addPayment, addActivity, updateFacility } = useData();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Live preview fields from edit panel
  const [liveFields, setLiveFields] = useState<{ invoiceNumber: string; invoiceDate: string; dueDate: string; notes: string; total: number } | null>(null);
  const saveRef = useRef<(() => Promise<void>) | null>(null);

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

  const handleStatusTransition = async (targetStatus: string) => {
    switch (targetStatus) {
      case 'draft':
        await updateInvoice({ ...invoice, status: 'draft', sent_at: null, paid_at: null });
        await addActivity({ invoice_id: invoice.id, action: 'reverted_to_draft', description: 'Invoice reverted to draft' });
        toast.success('Invoice moved back to Draft');
        break;
      case 'sent':
        if (invoice.status === 'paid' || invoice.status === 'partial') {
          await updateInvoice({ ...invoice, status: 'sent', paid_at: null });
          await addActivity({ invoice_id: invoice.id, action: 'reverted_to_sent', description: 'Invoice moved back to Sent' });
          toast.success('Invoice moved back to Sent');
        }
        break;
      case 'paid':
        toast.info('Record a payment to mark this invoice as paid');
        break;
    }
    setMoveDialogOpen(false);
    setMoveTarget(null);
  };

  const handleStepClick = (stepKey: string) => {
    if (stepKey === 'paid' && invoice.status !== 'paid') {
      toast.info('Record a payment to mark this invoice as paid');
      return;
    }
    setMoveTarget(stepKey);
    setMoveDialogOpen(true);
  };

  const getMoveDescription = (target: string): string => {
    const currentLabel = STATUS_CONFIG[computedStatus]?.label || computedStatus;
    const targetLabel = STATUS_CONFIG[target]?.label || target;
    const isBackward = getStepOrder(target) < getStepOrder(computedStatus);
    if (isBackward) {
      return `This will move the invoice from "${currentLabel}" back to "${targetLabel}". ${
        target === 'draft' ? 'The sent date will be cleared and you can edit the invoice again.' :
        'The payment status will be reset.'
      }`;
    }
    return `This will move the invoice from "${currentLabel}" to "${targetLabel}".`;
  };

  // Use live fields for preview when in draft mode
  const previewInvoiceNumber = isDraft && liveFields ? liveFields.invoiceNumber : invoice.invoice_number;
  const previewInvoiceDate = isDraft && liveFields ? liveFields.invoiceDate : invoice.invoice_date;
  const previewDueDate = isDraft && liveFields ? (liveFields.dueDate || null) : invoice.due_date;
  const previewNotes = isDraft && liveFields ? liveFields.notes : invoice.notes;
  const previewTotal = isDraft && liveFields ? liveFields.total : invoice.total_amount;

  return (
    <div className={isDraft ? 'pb-20' : ''}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <h1 className="page-title truncate">{invoice.invoice_number}</h1>
          <Badge variant={statusConfig.variant} className="text-xs shrink-0">
            {statusConfig.label}
          </Badge>
          {(invoice as any).invoice_type === 'bulk' && (
            <Badge variant="outline" className="text-xs shrink-0">Bulk</Badge>
          )}
          {(invoice as any).generation_type === 'automatic' && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30 shrink-0">Auto</Badge>
          )}
          <span className="text-sm text-muted-foreground truncate">{facility?.name}</span>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice {invoice.invoice_number}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this invoice and all its line items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stepper */}
      <div className="mb-4 max-w-2xl print:hidden">
        <InvoiceStepper status={computedStatus} onStepClick={handleStepClick} />
      </div>

      {/* Alerts */}
      <div className="space-y-2 mb-4 max-w-2xl print:hidden">
        {isDraft && (
          <ReadyToSendChecklist
            items={buildChecklistItems(profile, { ...invoice, due_date: liveFields?.dueDate || invoice.due_date }, items, facility)}
            onFixBilling={() => setBillingDialogOpen(true)}
          />
        )}
        {computedStatus === 'overdue' && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              This invoice is overdue. Due date was {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'not set'}.
            </p>
          </div>
        )}
        {invoice.generation_type === 'automatic' && (
          <div className="rounded-md border bg-primary/5 p-2.5 flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <span>Auto-generated for <strong>{facility?.name}</strong> · {items.filter(li => li.shift_id).length} shifts</span>
          </div>
        )}
      </div>

      {/* Main layout: Edit Panel + Live Preview */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT: Edit / Sent Panel */}
        <div className="lg:col-span-2 space-y-3 print:hidden">
          {isDraft ? (
            <InvoiceEditPanel
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
              onSaveRef={saveRef}
              onInvoiceFieldChange={setLiveFields}
            />
          ) : (
            <InvoiceSentPanel
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

          {/* Timeline */}
          {invoiceActivities.length > 0 && (
            <Card>
              <CardContent className="pt-3 pb-3">
                <InvoiceTimeline events={invoiceActivities} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Live Preview — sticky & prominent */}
        <div className="lg:col-span-3 lg:sticky lg:top-4 self-start" id="invoice-print-area">
          <div className="mb-2 flex items-center justify-between print:hidden">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Preview</p>
            {isDraft && <span className="text-[10px] text-muted-foreground">Changes update in real-time</span>}
          </div>
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
            balanceDue={isDraft ? previewTotal : invoice.balance_due}
            notes={previewNotes}
          />
        </div>
      </div>

      {/* Sticky bottom action bar for drafts */}
      {isDraft && (
        <InvoiceActionBar
          invoice={invoice}
          items={items}
          facility={facility}
          profile={profile}
          dueDate={liveFields?.dueDate || invoice.due_date?.split('T')[0] || ''}
          onSave={async () => { if (saveRef.current) await saveRef.current(); }}
          onUpdateInvoice={updateInvoice}
          onAddActivity={addActivity}
        />
      )}

      {/* Move Status Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {moveTarget && getStepOrder(moveTarget) < getStepOrder(computedStatus) ? (
                <Undo2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
              Move to {STATUS_CONFIG[moveTarget || '']?.label || moveTarget}?
            </DialogTitle>
            <DialogDescription>
              {moveTarget ? getMoveDescription(moveTarget) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => moveTarget && handleStatusTransition(moveTarget)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Details Dialog */}
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

// ─── Billing Details Dialog ─────────────────────────────────

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
            Add the billing contact details for {facility?.name || 'this facility'}. These will be saved to the facility and used on all future invoices.
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
