import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, DollarSign, Trash2, Plus, CheckCircle, AlertTriangle, Download, Link2, Copy, RefreshCw, Loader2, Pencil, Check, X, ArrowRight, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { computeInvoiceStatus, generateId } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { InvoiceStepper } from '@/components/invoice/InvoiceStepper';
import { ReadyToSendChecklist, buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { InvoiceTimeline } from '@/components/invoice/InvoiceTimeline';
import { RecordPaymentDialog } from '@/components/invoice/RecordPaymentDialog';
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

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  partial: { label: 'Partial', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  paid: { label: 'Paid', variant: 'default' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, lineItems, facilities, contacts, payments, activities, updateInvoice, deleteInvoice, addLineItem, updateLineItem, deleteLineItem, addPayment, addActivity } = useData();
  const { profile } = useUserProfile();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  const invoice = invoices.find(i => i.id === id);
  if (!invoice) return <div className="p-6">Invoice not found. <Button variant="link" onClick={() => navigate('/invoices')}>Back</Button></div>;

  const items = lineItems.filter(li => li.invoice_id === id);
  const facility = facilities.find(c => c.id === invoice.facility_id);
  const billingContact = contacts.find(c => c.facility_id === invoice.facility_id);
  const invoicePayments = payments.filter(p => p.invoice_id === id);
  const invoiceActivities = activities.filter(a => a.invoice_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const computedStatus = computeInvoiceStatus(invoice);
  const isDraft = invoice.status === 'draft';
  const isSent = invoice.status === 'sent' || computedStatus === 'overdue' || invoice.status === 'partial';
  const statusConfig = STATUS_CONFIG[computedStatus] || STATUS_CONFIG.draft;

  const handleDelete = async () => {
    await deleteInvoice(invoice.id);
    toast.success('Invoice deleted');
    navigate('/invoices');
  };

  // Unified status transition handler
  const handleStatusTransition = async (targetStatus: string) => {
    switch (targetStatus) {
      case 'draft':
        await updateInvoice({ ...invoice, status: 'draft', sent_at: null, paid_at: null });
        await addActivity({ invoice_id: invoice.id, action: 'reverted_to_draft', description: 'Invoice reverted to draft' });
        toast.success('Invoice moved back to Draft');
        break;
      case 'sent':
        if (invoice.status === 'paid' || invoice.status === 'partial') {
          // Moving backward from paid
          await updateInvoice({ ...invoice, status: 'sent', paid_at: null });
          await addActivity({ invoice_id: invoice.id, action: 'reverted_to_sent', description: 'Invoice moved back to Sent' });
          toast.success('Invoice moved back to Sent');
        }
        break;
      case 'paid':
        // This opens the record payment dialog instead
        break;
    }
    setMoveDialogOpen(false);
    setMoveTarget(null);
  };

  const handleStepClick = (stepKey: string) => {
    if (stepKey === 'paid' && invoice.status !== 'paid') {
      // Don't allow direct jump to paid - must record payment
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <h1 className="page-title">{invoice.invoice_number}</h1>
          <Badge variant={statusConfig.variant} className="text-xs">
            {statusConfig.label}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">{facility?.name}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Delete invoice */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
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
      </div>

      {/* Stepper — clickable for status transitions */}
      <div className="mb-6 max-w-2xl print:hidden">
        <InvoiceStepper status={computedStatus} onStepClick={handleStepClick} />
      </div>

      {/* Checklist for drafts */}
      {isDraft && (
        <div className="mb-6 max-w-2xl print:hidden">
          <ReadyToSendChecklist items={buildChecklistItems(profile, invoice, items, billingContact, facility)} />
        </div>
      )}

      {/* Overdue warning */}
      {computedStatus === 'overdue' && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/5 p-3 flex items-center gap-2 max-w-2xl print:hidden">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            This invoice is overdue. Due date was {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'not set'}.
          </p>
        </div>
      )}

      {/* Missing billing email warning */}
      {!billingContact?.email && invoice.status !== 'paid' && (
        <div className="mb-4 rounded-md border border-warning/50 bg-warning/5 p-3 flex items-center gap-2 max-w-2xl print:hidden">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm">Billing contact missing — <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/facilities/${invoice.facility_id}`)}>add one in Facility Overview</Button> to send faster.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Editable Form */}
        <div className="space-y-4 print:hidden">
          {isDraft ? (
            <DraftForm invoice={invoice} items={items} facility={facility} billingContact={billingContact} profile={profile}
              onUpdateInvoice={updateInvoice} onAddLineItem={addLineItem} onUpdateLineItem={updateLineItem}
              onDeleteLineItem={deleteLineItem} onAddActivity={addActivity} />
          ) : (
            <SentView invoice={invoice} items={items} invoicePayments={invoicePayments}
              onUpdateInvoice={updateInvoice} onAddPayment={addPayment} onAddActivity={addActivity} />
          )}

          {/* Timeline */}
          <Card>
            <CardContent className="pt-4">
              <InvoiceTimeline events={invoiceActivities} />
              {invoiceActivities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No activity yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="lg:sticky lg:top-6 self-start" id="invoice-print-area">
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
              contactName: billingContact?.name,
              email: billingContact?.email,
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
        </div>
      </div>

      {/* Move Status Confirmation Dialog */}
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
            <Button onClick={() => moveTarget && handleStatusTransition(moveTarget)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStepOrder(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent' || status === 'partial' || status === 'overdue') return 1;
  if (status === 'paid') return 2;
  return 0;
}

// ─── Editable Line Item Row ───────────────────────────────

function EditableLineItemRow({ item, onUpdate, onDelete }: { item: any; onUpdate: (updated: any) => Promise<void>; onDelete: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [date, setDate] = useState(item.service_date || '');
  const [qty, setQty] = useState(item.qty);
  const [rate, setRate] = useState(item.unit_rate);

  const handleSave = async () => {
    const lineTotal = qty * rate;
    await onUpdate({ ...item, description: desc, service_date: date || null, qty, unit_rate: rate, line_total: lineTotal });
    setEditing(false);
    toast.success('Line item updated');
  };

  const handleCancel = () => {
    setDesc(item.description);
    setDate(item.service_date || '');
    setQty(item.qty);
    setRate(item.unit_rate);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b last:border-0 bg-muted/30">
        <td className="py-1.5 pr-1">
          <Input value={desc} onChange={e => setDesc(e.target.value)} className="h-7 text-sm" />
        </td>
        <td className="py-1.5 px-1">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-sm" />
        </td>
        <td className="py-1.5 px-1">
          <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="h-7 text-sm text-right w-16" min={1} />
        </td>
        <td className="py-1.5 px-1">
          <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="h-7 text-sm text-right w-20" min={0} step="0.01" />
        </td>
        <td className="py-1.5 text-right font-medium text-sm">${(qty * rate).toLocaleString()}</td>
        <td className="py-1.5">
          <div className="flex gap-0.5">
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave}><Check className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancel}><X className="h-3 w-3" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0 group hover:bg-muted/20 cursor-pointer" onClick={() => setEditing(true)}>
      <td className="py-1.5">
        {item.description}
        {item.shift_id && <span className="text-xs text-primary ml-1">↗ shift</span>}
      </td>
      <td className="py-1.5 text-muted-foreground text-xs">{item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d') : '—'}</td>
      <td className="py-1.5 text-right">{item.qty}</td>
      <td className="py-1.5 text-right">${item.unit_rate}</td>
      <td className="py-1.5 text-right font-medium">${item.line_total}</td>
      <td className="py-1.5">
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={e => { e.stopPropagation(); setEditing(true); }}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={async e => { e.stopPropagation(); await onDelete(); }}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Draft Form ────────────────────────────────────────────

function DraftForm({ invoice, items, facility, billingContact, profile, onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem, onAddActivity }: any) {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(invoice.due_date?.split('T')[0] || '');
  const [notes, setNotes] = useState(invoice.notes || '');
  const [saving, setSaving] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newRate, setNewRate] = useState(0);

  const total = items.reduce((s: number, li: any) => s + li.line_total, 0);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateInvoice({
      ...invoice,
      invoice_number: invoiceNumber,
      invoice_date: new Date(invoiceDate).toISOString(),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes,
      total_amount: total,
      balance_due: total,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'saved', description: 'Invoice draft saved' });
    setSaving(false);
    toast.success('Invoice saved');
  };

  const handleProceedToSend = async () => {
    const checklist = buildChecklistItems(profile, { ...invoice, due_date: dueDate || invoice.due_date }, items, billingContact, facility);
    const required = checklist.filter((i: any) => i.required);
    const incomplete = required.filter((i: any) => !i.complete);
    if (incomplete.length > 0) {
      toast.error(`Complete required items: ${incomplete.map((i: any) => i.label).join(', ')}`);
      return;
    }
    await handleSave();
    await onUpdateInvoice({
      ...invoice,
      invoice_number: invoiceNumber,
      invoice_date: new Date(invoiceDate).toISOString(),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes,
      total_amount: total,
      balance_due: total,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'marked_sent', description: 'Invoice marked as sent' });
    toast.success('Invoice marked as sent');
  };

  const handleAddLineItem = async () => {
    if (!newDesc.trim()) return;
    const lineTotal = newQty * newRate;
    await onAddLineItem({
      invoice_id: invoice.id,
      shift_id: null,
      description: newDesc,
      service_date: newDate || null,
      qty: newQty,
      unit_rate: newRate,
      line_total: lineTotal,
    });
    setNewDesc(''); setNewDate(''); setNewQty(1); setNewRate(0); setShowAddLine(false);
    const newTotal = total + lineTotal;
    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
  };

  return (
    <div className="space-y-4">
      {/* From */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">From</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {profile?.company_name ? (
            <div>
              <p className="font-medium">{profile.first_name} {profile.last_name}</p>
              <p>{profile.company_name}</p>
              {profile.company_address && <p className="text-muted-foreground whitespace-pre-line">{profile.company_address}</p>}
            </div>
          ) : (
            <div className="rounded-md border border-warning/50 bg-warning/5 p-2">
              <p className="text-sm">Add your business address to send invoices.</p>
              <Button variant="link" size="sm" className="h-auto p-0 mt-1" onClick={() => navigate('/settings/invoice-profile')}>Add now</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill To */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bill To</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{facility?.name || 'Unknown'}</p>
          {billingContact && <p>{billingContact.name} — {billingContact.email || 'No email'}</p>}
          {facility?.address && <p className="text-muted-foreground">{facility.address}</p>}
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Invoice Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Invoice #</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground">Line Items</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-7"><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left">
              <th className="pb-1.5 font-medium text-muted-foreground text-xs">Description</th>
              <th className="pb-1.5 font-medium text-muted-foreground text-xs w-24">Date</th>
              <th className="pb-1.5 font-medium text-muted-foreground text-xs w-16 text-right">Qty</th>
              <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Rate</th>
              <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Total</th>
              <th className="w-8" />
            </tr></thead>
            <tbody>
              {items.map((li: any) => (
                <EditableLineItemRow
                  key={li.id}
                  item={li}
                  onUpdate={async (updated: any) => {
                    await onUpdateLineItem(updated);
                    const newTotal = items.reduce((s: number, x: any) => s + (x.id === updated.id ? updated.line_total : x.line_total), 0);
                    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
                  }}
                  onDelete={async () => {
                    await onDeleteLineItem(li.id);
                    const newTotal = total - li.line_total;
                    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
                  }}
                />
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground text-xs">No line items</td></tr>}
            </tbody>
          </table>
          {showAddLine && (
            <div className="border-t pt-3 mt-2 space-y-2">
              <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="h-8 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-sm" />
                <Input type="number" placeholder="Qty" value={newQty} onChange={e => setNewQty(Number(e.target.value))} className="h-8 text-sm" min={1} />
                <Input type="number" placeholder="Rate" value={newRate} onChange={e => setNewRate(Number(e.target.value))} className="h-8 text-sm" min={0} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddLineItem} className="h-7">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddLine(false)} className="h-7">Cancel</Button>
              </div>
            </div>
          )}
          <div className="flex justify-end border-t mt-3 pt-2">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">${total.toLocaleString()}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Notes / Memo</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any notes or terms..." rows={3} className="text-sm" />
        </CardContent>
      </Card>

      {/* Actions — improved hierarchy */}
      <div className="space-y-2">
        <Button onClick={handleProceedToSend} className="w-full" size="lg">
          <ArrowRight className="mr-2 h-4 w-4" /> Save and Continue
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline" disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <DraftPdfButton invoiceId={invoice.id} invoiceNumber={invoice.invoice_number} />
        </div>
      </div>
    </div>
  );
}

function DraftPdfButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoiceId, invoiceNumber);
      toast.success('PDF downloaded');
    } catch { toast.error('PDF generation failed'); }
    finally { setPdfLoading(false); }
  };
  return (
    <Button variant="outline" className="flex-1" onClick={handleDownloadPdf} disabled={pdfLoading}>
      {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {pdfLoading ? 'Generating…' : 'PDF'}
    </Button>
  );
}

// ─── Sent View ─────────────────────────────────────────────

function SentView({ invoice, items, invoicePayments, onUpdateInvoice, onAddPayment, onAddActivity }: any) {
  const [showPayment, setShowPayment] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const computedStatus = computeInvoiceStatus(invoice);
  const isPaid = invoice.status === 'paid';
  const hasShareLink = !!invoice.share_token && !invoice.share_token_revoked_at;

  const shareUrl = hasShareLink ? `${window.location.origin}/invoice/public/${invoice.share_token}` : '';

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    const token = crypto.randomUUID();
    await onUpdateInvoice({
      ...invoice,
      share_token: token,
      share_token_created_at: new Date().toISOString(),
      share_token_revoked_at: null,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_created', description: 'Share link created' });
    setShareLoading(false);
    toast.success('Share link created');
  };

  const handleRevokeShareLink = async () => {
    await onUpdateInvoice({
      ...invoice,
      share_token_revoked_at: new Date().toISOString(),
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_revoked', description: 'Share link revoked' });
    toast.success('Share link revoked');
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleRegenerateShareLink = async () => {
    setShareLoading(true);
    const token = generateId() + '-' + generateId();
    await onUpdateInvoice({
      ...invoice,
      share_token: token,
      share_token_created_at: new Date().toISOString(),
      share_token_revoked_at: null,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_regenerated', description: 'Share link regenerated (old link invalidated)' });
    setShareLoading(false);
    toast.success('New share link generated');
  };

  const handleResend = async () => {
    await onUpdateInvoice({ ...invoice, sent_at: new Date().toISOString() });
    await onAddActivity({ invoice_id: invoice.id, action: 'resent', description: 'Invoice resent' });
    toast.success('Sent date updated');
  };

  const handleRecordPayment = async (payment: any) => {
    await onAddPayment({ invoice_id: invoice.id, ...payment });
    const newBalance = Math.max(0, invoice.balance_due - payment.amount);
    const isPaidNow = newBalance <= 0;
    await onUpdateInvoice({
      ...invoice,
      balance_due: newBalance,
      status: isPaidNow ? 'paid' : 'partial',
      paid_at: isPaidNow ? new Date().toISOString() : invoice.paid_at,
    });
    await onAddActivity({
      invoice_id: invoice.id,
      action: isPaidNow ? 'paid_in_full' : 'payment_recorded',
      description: isPaidNow ? `Paid in full — $${payment.amount}` : `Payment recorded — $${payment.amount} via ${payment.method}`,
    });
    toast.success(isPaidNow ? 'Invoice paid in full!' : 'Payment recorded');
  };

  return (
    <div className="space-y-4">
      {/* Status + Balance — consolidated */}
      <Card>
        <CardContent className="pt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Balance Due</span>
            <span className={`font-bold text-xl ${computedStatus === 'overdue' ? 'text-destructive' : computedStatus === 'paid' ? 'text-primary' : 'text-foreground'}`}>
              ${invoice.balance_due.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1 border-t text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Invoice Date</p>
              <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Due Date</p>
              <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Sent</p>
              <p className="font-medium">{invoice.sent_at ? format(new Date(invoice.sent_at), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>

          {/* Primary action */}
          {!isPaid && (
            <Button className="w-full" size="lg" onClick={() => setShowPayment(true)}>
              <DollarSign className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
          {isPaid && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Paid in full
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send & Share Actions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Send & Share</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownloadPdf} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {pdfLoading ? 'Generating…' : 'PDF'}
            </Button>
            {invoice.sent_at && (
              <Button variant="outline" className="flex-1" onClick={handleResend}>
                <Send className="mr-2 h-4 w-4" /> Resend
              </Button>
            )}
          </div>

          {/* Share Link */}
          {hasShareLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-xs font-mono break-all">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyShareLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateShareLink} disabled={shareLoading}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={handleRevokeShareLink}>
                Revoke Link
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={handleCreateShareLink} disabled={shareLoading}>
              <Link2 className="mr-2 h-4 w-4" /> Create Share Link
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Line Items (read-only) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Line Items ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {items.map((li: any) => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-1.5">{li.description}{li.shift_id && <span className="text-xs text-primary ml-1">↗ shift</span>}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{li.qty} × ${li.unit_rate}</td>
                  <td className="py-1.5 text-right font-medium w-20">${li.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoicePayments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoicePayments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                  <div>
                    <p className="font-medium">${p.amount.toLocaleString()} via {p.method}</p>
                    <p className="text-xs text-muted-foreground">{p.account}{p.memo ? ` — ${p.memo}` : ''}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(p.payment_date), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RecordPaymentDialog open={showPayment} onOpenChange={setShowPayment} balanceDue={invoice.balance_due} onRecord={handleRecordPayment} />
    </div>
  );
}
