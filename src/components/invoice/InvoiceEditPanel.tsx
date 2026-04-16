import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Check, X, Trash2, CheckCircle, PiggyBank, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RecordPaymentDialog } from '@/components/invoice/RecordPaymentDialog';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { computeEffectiveSetAsideRate, getShiftTaxNudge } from '@/lib/taxNudge';
import { useData } from '@/contexts/DataContext';

/** Convert any date value to a timezone-safe YYYY-MM-DD string for storage. */
function toDateOnlyISO(v: string | Date | null | undefined): string {
  if (!v) return '';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const d = v as Date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function ReadOnlyLineItemRow({ item }: { item: any }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5">
        {item.description}
        {item.shift_id && <span className="text-xs text-primary ml-1">↗ shift</span>}
      </td>
      <td className="py-1.5 text-muted-foreground text-xs">{item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d') : '—'}</td>
      <td className="py-1.5 text-right">{item.qty}</td>
      <td className="py-1.5 text-right">${item.unit_rate}</td>
      <td className="py-1.5 text-right font-medium">${item.line_total}</td>
    </tr>
  );
}

interface InvoiceEditPanelProps {
  invoice: any;
  items: any[];
  facility: any;
  profile: any;
  billingNameTo: string;
  billingEmailTo: string;
  readOnly?: boolean;
  invoicePayments?: any[];
  paymentDialogOpen?: boolean;
  onPaymentDialogChange?: (open: boolean) => void;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddLineItem?: (item: any) => Promise<void>;
  onUpdateLineItem?: (item: any) => Promise<void>;
  onDeleteLineItem?: (id: string) => Promise<void>;
  onAddPayment?: (payment: any) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
  onOpenBillingDialog: () => void;
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onInvoiceFieldChange?: (fields: { invoiceNumber: string; invoiceDate: string; dueDate: string; notes: string; total: number }) => void;
  onRevertToDraft?: () => void;
}

export function InvoiceEditPanel({
  invoice, items, facility, profile, billingNameTo, billingEmailTo,
  readOnly = false, invoicePayments = [],
  paymentDialogOpen: externalPaymentOpen, onPaymentDialogChange,
  onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem,
  onAddPayment, onAddActivity, onOpenBillingDialog,
  onSaveRef, onInvoiceFieldChange, onRevertToDraft,
}: InvoiceEditPanelProps) {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(invoice.due_date?.split('T')[0] || '');
  const [notes, setNotes] = useState(invoice.notes || '');
  const [showAddLine, setShowAddLine] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newRate, setNewRate] = useState(0);
  const showPayment = externalPaymentOpen ?? false;
  const setShowPayment = onPaymentDialogChange ?? (() => {});
  const [showPayNudge, setShowPayNudge] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);

  const { profile: taxProfile, hasProfile: hasTaxProfile } = useTaxIntelligence();
  const { invoices: allInvoices, shifts } = useData();

  const total = items.reduce((s: number, li: any) => s + li.line_total, 0);
  const computedStatus = computeInvoiceStatus(invoice);
  const isPaid = invoice.status === 'paid';

  // Compute effective rate for tax nudge
  const effectiveRate = (() => {
    if (!hasTaxProfile || !taxProfile) return 0;
    const yr = new Date().getFullYear();
    const earned = allInvoices
      .filter(inv => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at).getFullYear() === yr)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const projected = shifts.filter(s => new Date(s.start_datetime) >= new Date()).reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    return computeEffectiveSetAsideRate(taxProfile, (earned + projected) || 1);
  })();

  // Auto-dismiss pay nudge
  useEffect(() => {
    if (showPayNudge) {
      const t = setTimeout(() => setShowPayNudge(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showPayNudge]);

  // Sync state when invoice changes externally (e.g. after status transition)
  useEffect(() => {
    setInvoiceNumber(invoice.invoice_number);
    setInvoiceDate(invoice.invoice_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
    setDueDate(invoice.due_date?.split('T')[0] || '');
    setNotes(invoice.notes || '');
  }, [invoice.id, invoice.status]);

  // Expose fields for live preview
  useEffect(() => {
    if (!readOnly) {
      onInvoiceFieldChange?.({ invoiceNumber, invoiceDate, dueDate, notes, total });
    }
  }, [invoiceNumber, invoiceDate, dueDate, notes, total, readOnly]);

  // Auto-save draft on field changes (debounced) — only in edit mode
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (readOnly) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await onUpdateInvoice({
        ...invoice,
        invoice_number: invoiceNumber,
        invoice_date: toDateOnlyISO(invoiceDate),
        due_date: dueDate ? toDateOnlyISO(dueDate) : null,
        notes,
        total_amount: total,
        balance_due: total,
      });
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [invoiceNumber, invoiceDate, dueDate, notes, total, readOnly]);

  // Expose save function for action bar
  const handleSave = async () => {
    await onUpdateInvoice({
      ...invoice,
      invoice_number: invoiceNumber,
      invoice_date: toDateOnlyISO(invoiceDate),
      due_date: dueDate ? toDateOnlyISO(dueDate) : null,
      notes,
      total_amount: total,
      balance_due: total,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'saved', description: 'Invoice draft saved' });
    toast.success('Invoice saved');
  };

  if (onSaveRef && !readOnly) {
    onSaveRef.current = handleSave;
  }

  const handleAddLineItem = async () => {
    if (!newDesc.trim() || !onAddLineItem) return;
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

  const handleRecordPayment = async (payment: any) => {
    if (!onAddPayment) return;
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
    if (isPaidNow && hasTaxProfile) {
      setShowPayNudge(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Paid banner */}
      {isPaid && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary font-medium">
          <CheckCircle className="h-5 w-5" /> Paid in full
        </div>
      )}

      {/* Tax nudge after payment */}
      {showPayNudge && effectiveRate > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-[hsl(var(--warning))]/10 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <PiggyBank className="h-4 w-4 text-[hsl(var(--warning))] shrink-0" />
          <span>
            <span className="font-medium">Invoice marked paid ✓</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-[hsl(var(--warning))]">
              Set aside ${getShiftTaxNudge(invoice.total_amount || 0, effectiveRate).setAsideAmount.toLocaleString()} for taxes
            </span>
          </span>
        </div>
      )}

      {/* From + Bill To compact */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">From</CardTitle></CardHeader>
          <CardContent className="text-sm px-3 pb-3">
            {profile?.company_name ? (
              <div>
                <p className="font-medium text-sm">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-muted-foreground">{profile.company_name}</p>
              </div>
            ) : (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate('/settings/invoice-profile')}>Add business info</Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Bill To</CardTitle></CardHeader>
          <CardContent className="text-sm px-3 pb-3">
            <p className="font-medium text-sm">{facility?.name || 'Unknown'}</p>
            {billingNameTo ? (
              <p className="text-xs text-muted-foreground">{billingNameTo}</p>
            ) : (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenBillingDialog}>Add billing contact</Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardContent className="pt-3 pb-3 space-y-2">
          {readOnly ? (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Invoice #</Label>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Date</Label>
                <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Invoice #</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Line Items ({items.length})</CardTitle>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Add</Button>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {!readOnly && (
                <thead><tr className="border-b text-left">
                  <th className="pb-1.5 font-medium text-muted-foreground text-xs">Description</th>
                  <th className="pb-1.5 font-medium text-muted-foreground text-xs w-24">Date</th>
                  <th className="pb-1.5 font-medium text-muted-foreground text-xs w-16 text-right">Qty</th>
                  <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Rate</th>
                  <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Total</th>
                  <th className="w-8" />
                </tr></thead>
              )}
              <tbody>
                {readOnly
                  ? items.map((li: any) => <ReadOnlyLineItemRow key={li.id} item={li} />)
                  : items.map((li: any) => (
                    <EditableLineItemRow
                      key={li.id}
                      item={li}
                      onUpdate={async (updated: any) => {
                        if (!onUpdateLineItem) return;
                        await onUpdateLineItem(updated);
                        const newTotal = items.reduce((s: number, x: any) => s + (x.id === updated.id ? updated.line_total : x.line_total), 0);
                        await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
                      }}
                      onDelete={async () => {
                        if (!onDeleteLineItem) return;
                        await onDeleteLineItem(li.id);
                        const newTotal = total - li.line_total;
                        await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
                      }}
                    />
                  ))
                }
                {items.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground text-xs">No line items</td></tr>}
              </tbody>
            </table>
          </div>
          {!readOnly && showAddLine && (
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
            <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground text-base">${total.toLocaleString()}</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes / Memo</Label>
          {readOnly ? (
            <p className="text-sm mt-1.5">{invoice.notes || <span className="text-muted-foreground italic">No notes</span>}</p>
          ) : (
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank you note, etc." rows={2} className="text-sm mt-1.5" />
          )}
        </CardContent>
      </Card>

      {/* Payment History — collapsible, shown in read-only mode */}
      {readOnly && invoicePayments.length > 0 && (
        <Collapsible open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-1.5 pt-3 px-3 cursor-pointer hover:bg-muted/50 rounded-t-lg flex flex-row items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Payment History ({invoicePayments.length})</CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paymentHistoryOpen ? 'rotate-180' : ''}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 pb-3">
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
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        balanceDue={invoice.balance_due}
        onRecord={handleRecordPayment}
      />
    </div>
  );
}
