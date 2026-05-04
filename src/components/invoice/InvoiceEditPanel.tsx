import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Check, X, Trash2, CheckCircle, PiggyBank, ChevronDown, CalendarClock, FileText, Pencil as PencilIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RecordPaymentDialog } from '@/components/invoice/RecordPaymentDialog';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { computeEffectiveSetAsideRate, getShiftTaxNudge } from '@/lib/taxNudge';
import { useData } from '@/contexts/DataContext';
import { syncShiftFromLineItems, canSyncShiftForLine } from '@/lib/shiftInvoiceSync';
import { termsToRates } from '@/components/facilities/RatesEditor';

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

const fmtMoney = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function parseShiftMeta(item: any): { dateStr: string | null; timeStr: string | null; label: string } {
  // description tends to look like: "Apr 16, 2026 — Relief coverage (8:00 AM – 6:00 PM)"
  const desc: string = item.description || '';
  const m = desc.match(/^(.+?)\s+[—-]\s+(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { dateStr: m[1], label: m[2], timeStr: m[3] };
  return { dateStr: null, timeStr: null, label: desc };
}

function ShiftLineItemCard({
  item, readOnly, onUpdate, onDelete, showSyncHint,
}: {
  item: any;
  readOnly?: boolean;
  onUpdate?: (u: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  showSyncHint?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [date, setDate] = useState(item.service_date || '');
  const [qty, setQty] = useState<string>(String(item.qty ?? ''));
  const [rate, setRate] = useState<string>(String(item.unit_rate ?? ''));

  const qtyNum = parseFloat(qty) || 0;
  const rateNum = parseFloat(rate) || 0;

  const handleSave = async () => {
    if (!onUpdate) return;
    const lineTotal = qtyNum * rateNum;
    await onUpdate({ ...item, description: desc, service_date: date || null, qty: qtyNum, unit_rate: rateNum, line_total: lineTotal });
    setEditing(false);
    toast.success('Line item updated');
  };
  const handleCancel = () => {
    setDesc(item.description); setDate(item.service_date || '');
    setQty(String(item.qty ?? '')); setRate(String(item.unit_rate ?? '')); setEditing(false);
  };

  const meta = parseShiftMeta(item);
  const isShift = !!item.shift_id;
  const Icon = isShift ? CalendarClock : FileText;

  if (editing) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <Input value={desc} onChange={e => setDesc(e.target.value)} className="h-8 text-sm" placeholder="Description" />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Qty{item.line_kind === 'regular' ? ' (hrs)' : ''}</Label>
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} className="h-8 text-sm" min={0} step="0.25" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">Rate</Label>
            <Input type="number" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} className="h-8 text-sm" min={0} step="0.01" />
          </div>
        </div>
        {showSyncHint && (
          <p className="text-[11px] text-muted-foreground italic">Editing this updates the shift on your schedule.</p>
        )}
        <div className="flex justify-between items-center pt-1">
          <span className="text-sm text-muted-foreground">Line total: <span className="font-semibold text-foreground">{fmtMoney(qtyNum * rateNum)}</span></span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7" onClick={handleCancel}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
            <Button size="sm" className="h-7" onClick={handleSave}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group rounded-lg border bg-card p-3 transition-colors ${!readOnly ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/30' : ''}`}
      onClick={() => !readOnly && setEditing(true)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-md p-1.5 shrink-0 ${isShift ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium truncate">
              {meta.dateStr || (item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d, yyyy') : meta.label)}
            </p>
            <p className="text-sm font-semibold tabular-nums shrink-0">{fmtMoney(item.line_total)}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {meta.dateStr ? <>{meta.label}{meta.timeStr ? ` · ${meta.timeStr}` : ''}</> : null}
            {!meta.dateStr && item.qty > 1 ? null : null}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              {isShift && item.line_kind === 'regular' ? (
                <>
                  <span>{item.qty}h × {fmtMoney(item.unit_rate)}/hr</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">Hourly</span>
                </>
              ) : isShift && item.qty !== 1 && !item.line_kind ? (
                <>
                  <span>{item.qty}h × {fmtMoney(item.unit_rate)}/hr</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">Hourly</span>
                </>
              ) : (
                <>
                  <span>{item.qty} × {fmtMoney(item.unit_rate)}</span>
                  {isShift && (
                    <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5">Flat</span>
                  )}
                </>
              )}
              {isShift && <span className="ml-1.5 text-primary">· from shift ✓</span>}
            </p>
            {!readOnly && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); setEditing(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={async e => { e.stopPropagation(); if (onDelete) await onDelete(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {showSyncHint && !readOnly && (
            <p className="text-[10.5px] text-muted-foreground/80 italic mt-1.5">Editing this updates the shift on your schedule.</p>
          )}
        </div>
      </div>
    </div>
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
  onSaveRef, onInvoiceFieldChange,
}: InvoiceEditPanelProps) {
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
  const [notesOpen, setNotesOpen] = useState(!!(invoice.notes && invoice.notes.length > 0));

  const { profile: taxProfile, hasProfile: hasTaxProfile } = useTaxIntelligence();
  const { invoices: allInvoices, shifts, terms, updateShift } = useData();

  const total = items.reduce((s: number, li: any) => s + li.line_total, 0);
  const isPaid = invoice.status === 'paid';
  const isAuto = invoice.generation_type === 'automatic';
  const netDays = facility?.invoice_due_days ?? 15;

  // Find last shift date represented in line items (for date helper text)
  const lastShiftDate = (() => {
    const dates = items.map((li: any) => li.service_date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  })();

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

  useEffect(() => {
    if (showPayNudge) {
      const t = setTimeout(() => setShowPayNudge(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showPayNudge]);

  useEffect(() => {
    setInvoiceNumber(invoice.invoice_number);
    setInvoiceDate(invoice.invoice_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
    setDueDate(invoice.due_date?.split('T')[0] || '');
    setNotes(invoice.notes || '');
  }, [invoice.id, invoice.status]);

  useEffect(() => {
    if (!readOnly) {
      onInvoiceFieldChange?.({ invoiceNumber, invoiceDate, dueDate, notes, total });
    }
  }, [invoiceNumber, invoiceDate, dueDate, notes, total, readOnly]);

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
      description: isPaidNow ? `Paid in full — ${fmtMoney(payment.amount)}` : `Payment recorded — ${fmtMoney(payment.amount)} via ${payment.method}`,
    });
    toast.success(isPaidNow ? 'Invoice paid in full!' : 'Payment recorded');
    if (isPaidNow && hasTaxProfile) setShowPayNudge(true);
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
              Set aside {fmtMoney(getShiftTaxNudge(invoice.total_amount || 0, effectiveRate).setAsideAmount)} for taxes
            </span>
          </span>
        </div>
      )}

      {/* Dates Card */}
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {readOnly ? (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Invoice #</Label>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Issued</Label>
                <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Due</Label>
                <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Invoice #</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Issued</Label>
                  <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div data-due-date-field>
                  <Label className="text-xs text-muted-foreground">Due</Label>
                  <Input id="invoice-due-date-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              {isAuto && (
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                  {lastShiftDate && (
                    <p>↳ Issue date set to last shift ({format(new Date(lastShiftDate + 'T00:00:00'), 'MMM d')})</p>
                  )}
                  <p>↳ Due date is Net {netDays} from issue date</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Line Items as card list */}
      <Card data-line-items-section>
        <CardHeader className="pb-1.5 pt-3 px-3">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
            {readOnly ? 'Line Items' : 'Shifts on this invoice'} ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {items.length === 0 ? (
            <p className="py-3 text-center text-muted-foreground text-xs">No line items yet</p>
          ) : (
            items.map((li: any) => {
              const shift = li.shift_id ? shifts.find(s => s.id === li.shift_id) : null;
              const syncEligible = canSyncShiftForLine(invoice.status, li.line_kind, li.shift_id);

              return (
                <ShiftLineItemCard
                  key={li.id}
                  item={li}
                  readOnly={readOnly}
                  showSyncHint={syncEligible}
                  onUpdate={async (updated) => {
                    if (!onUpdateLineItem) return;
                    await onUpdateLineItem(updated);
                    const nextItems = items.map((x: any) => x.id === updated.id ? updated : x);
                    const newTotal = nextItems.reduce((s: number, x: any) => s + (x.line_total || 0), 0);
                    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });

                    // Sync underlying shift if eligible
                    if (syncEligible && shift) {
                      const result = syncShiftFromLineItems(shift, nextItems);
                      if (result) {
                        await updateShift({ ...shift, ...result.patch });
                        await onAddActivity({
                          invoice_id: invoice.id,
                          action: 'shift_synced',
                          description: result.summary,
                        });
                      }
                    }
                  }}
                  onDelete={async () => {
                    if (!onDeleteLineItem) return;
                    await onDeleteLineItem(li.id);
                    const nextItems = items.filter((x: any) => x.id !== li.id);
                    const newTotal = nextItems.reduce((s: number, x: any) => s + (x.line_total || 0), 0);
                    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });

                    if (syncEligible && shift) {
                      const result = syncShiftFromLineItems(shift, nextItems);
                      if (result) {
                        await updateShift({ ...shift, ...result.patch });
                        await onAddActivity({
                          invoice_id: invoice.id,
                          action: 'shift_synced',
                          description: result.summary,
                        });
                      }
                    }
                  }}
                />
              );
            })
          )}

          {!readOnly && !showAddLine && (
            <div className="flex justify-start pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add custom line
              </Button>
            </div>
          )}

          {!readOnly && showAddLine && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="h-8 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-sm" />
                <Input type="number" placeholder="Qty" value={newQty} onChange={e => setNewQty(Number(e.target.value))} className="h-8 text-sm" min={1} />
                <Input type="number" placeholder="Rate" value={newRate} onChange={e => setNewRate(Number(e.target.value))} className="h-8 text-sm" min={0} step="0.01" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Line total: <span className="font-semibold text-foreground">{fmtMoney(newQty * newRate)}</span></span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddLine(false)} className="h-7">Cancel</Button>
                  <Button size="sm" onClick={handleAddLineItem} className="h-7">Add</Button>
                </div>
              </div>
            </div>
          )}

          {/* Subtotal mirror */}
          <div className="flex items-center justify-between border-t pt-2 mt-2">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-base font-bold tabular-nums">{fmtMoney(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bill-to one-liner */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span className="truncate">
          Billing to: <span className="text-foreground font-medium">{billingNameTo || 'No contact set'}</span>
          {facility?.name && <> at {facility.name}</>}
        </span>
        {!readOnly && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenBillingDialog}>
            <PencilIcon className="h-3 w-3 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Notes — collapsed by default */}
      {readOnly ? (
        invoice.notes ? (
          <Card>
            <CardContent className="pt-3 pb-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
              <p className="text-sm mt-1.5">{invoice.notes}</p>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/40 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {notesOpen ? 'Notes / Memo' : (notes ? 'Notes / Memo' : '+ Add notes')}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 px-3">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank you note, etc." rows={2} className="text-sm" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Payment History — collapsible (read-only) */}
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
                        <p className="font-medium">{fmtMoney(p.amount)} via {p.method}</p>
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

      <RecordPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        balanceDue={invoice.balance_due}
        onRecord={handleRecordPayment}
      />
    </div>
  );
}
