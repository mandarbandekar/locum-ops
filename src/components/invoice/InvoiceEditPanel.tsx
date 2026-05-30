import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Check, X, Trash2, CheckCircle, PiggyBank, ChevronDown, CalendarClock, FileText, Pencil as PencilIcon, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RecordPaymentDialog } from '@/components/invoice/RecordPaymentDialog';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { computeEffectiveSetAsideRate, getShiftTaxNudge } from '@/lib/taxNudge';
import { useData } from '@/contexts/DataContext';
import { syncShiftFromLineItems, canSyncShiftForLine } from '@/lib/shiftInvoiceSync';
import { termsToRates } from '@/components/facilities/RatesEditor';
import { resolveShiftTz } from '@/lib/resolveTimezone';
import { formatYMDInTz } from '@/lib/tzTime';

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

/** Format an hour quantity with sub-hour amounts shown as minutes (e.g. 0.25 → "15 min", 1.5 → "1h 30m"). */
function formatHours(qty: number | string): string {
  const n = Number(qty) || 0;
  if (n === 0) return '0h';
  const totalMin = Math.round(n * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseShiftMeta(item: any): { dateStr: string | null; timeStr: string | null; label: string } {
  // description tends to look like: "Apr 16, 2026 — Relief coverage (8:00 AM – 6:00 PM)"
  const desc: string = item.description || '';
  const m = desc.match(/^(.+?)\s+[—-]\s+(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { dateStr: m[1], label: m[2], timeStr: m[3] };
  return { dateStr: null, timeStr: null, label: desc };
}

function ShiftLineItemCard({
  item, readOnly, onUpdate, onDelete, showSyncHint, onAddOvertime, hasOvertime,
  clinicOvertimeRate,
}: {
  item: any;
  readOnly?: boolean;
  onUpdate?: (u: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  showSyncHint?: boolean;
  onAddOvertime?: () => void;
  hasOvertime?: boolean;
  /** Clinic-saved overtime rate (or null when none). Used to flag overrides. */
  clinicOvertimeRate?: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [date, setDate] = useState(item.service_date || '');
  const isOvertime = item.line_kind === 'overtime';
  // For overtime, edit in minutes (15-min steps). For everything else, edit in original units.
  const [qty, setQty] = useState<string>(
    isOvertime ? String(Math.round((Number(item.qty) || 0) * 60)) : String(item.qty ?? '')
  );
  const [rate, setRate] = useState<string>(String(item.unit_rate ?? ''));

  const rateNum = parseFloat(rate) || 0;
  // qtyNum is always in the line item's stored unit (hours for OT/regular, units otherwise)
  const qtyNum = isOvertime ? (parseFloat(qty) || 0) / 60 : (parseFloat(qty) || 0);

  const handleSave = async () => {
    if (!onUpdate) return;
    const lineTotal = Math.round(qtyNum * rateNum * 100) / 100;
    await onUpdate({ ...item, description: desc, service_date: date || null, qty: qtyNum, unit_rate: rateNum, line_total: lineTotal });
    setEditing(false);
    toast.success('Line item updated');
  };
  const handleCancel = () => {
    setDesc(item.description); setDate(item.service_date || '');
    setQty(isOvertime ? String(Math.round((Number(item.qty) || 0) * 60)) : String(item.qty ?? ''));
    setRate(String(item.unit_rate ?? '')); setEditing(false);
  };

  const meta = parseShiftMeta(item);
  const isShift = !!item.shift_id;
  // Overtime override = clinic has a saved overtime rate AND this line uses a different rate.
  const hasClinicOt = isOvertime && clinicOvertimeRate != null && Number(clinicOvertimeRate) > 0;
  const isOtOverride = hasClinicOt && Math.abs(Number(item.unit_rate || 0) - Number(clinicOvertimeRate)) > 0.001;
  const editMatchesClinic = hasClinicOt && Math.abs(rateNum - Number(clinicOvertimeRate)) < 0.001;
  const Icon = isShift ? CalendarClock : FileText;

  if (editing) {
    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); }
    };
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3" onKeyDown={onKeyDown}>
        <div>
          <Label htmlFor={`li-desc-${item.id}`} className="text-[10px] text-muted-foreground uppercase">Description</Label>
          <Input
            id={`li-desc-${item.id}`}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="h-9 text-sm mt-1"
            placeholder="Description"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label htmlFor={`li-date-${item.id}`} className="text-[10px] text-muted-foreground uppercase">Date</Label>
            <Input id={`li-date-${item.id}`} type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label htmlFor={`li-qty-${item.id}`} className="text-[10px] text-muted-foreground uppercase">
              {isOvertime ? 'Qty (min)' : (item.line_kind === 'regular' ? 'Qty (hrs)' : 'Qty')}
            </Label>
            <Input
              id={`li-qty-${item.id}`}
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="h-9 text-sm mt-1"
              min={0}
              step={isOvertime ? 15 : (item.line_kind === 'regular' ? 0.25 : 'any')}
              aria-label="Quantity"
            />
            {isOvertime ? (
              <>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[15, 30, 45, 60, 90, 120].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setQty(String(min))}
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${Number(qty) === min ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {min < 60 ? `${min}m` : (min % 60 === 0 ? `${min / 60}h` : `${Math.floor(min / 60)}h ${min % 60}m`)}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Enter minutes (15-min steps)</p>
              </>
            ) : (item.line_kind === 'regular' && (
              <p className="text-[10px] text-muted-foreground mt-1">15-min steps (0.25 = 15 min, 0.5 = 30 min)</p>
            ))}
          </div>
          <div>
            <Label htmlFor={`li-rate-${item.id}`} className="text-[10px] text-muted-foreground uppercase">Rate{isOvertime ? ' / hr' : ''}</Label>
            <Input id={`li-rate-${item.id}`} type="number" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} className="h-9 text-sm mt-1" min={0} step="0.01" aria-label="Rate" />
            {hasClinicOt && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  Clinic rate: {fmtMoney(Number(clinicOvertimeRate))}/hr
                </span>
                {!editMatchesClinic && (
                  <button
                    type="button"
                    onClick={() => setRate(String(clinicOvertimeRate))}
                    className="text-[10px] font-medium text-primary hover:underline"
                  >
                    Reset to clinic rate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {isOvertime && rateNum > 0 && hasClinicOt && !editMatchesClinic && (
          <p className="text-[11px] text-[hsl(var(--warning))] italic">
            Override applied: this overtime line uses {fmtMoney(rateNum)}/hr instead of the clinic's saved {fmtMoney(Number(clinicOvertimeRate))}/hr.
          </p>
        )}
        {showSyncHint && (
          <p className="text-[11px] text-muted-foreground italic">Editing this updates the shift on your schedule.</p>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-1 border-t">
          <span className="text-sm text-muted-foreground">
            Line total: <span className="font-semibold text-foreground tabular-nums">{fmtMoney(qtyNum * rateNum)}</span>
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" className="h-9 flex-1 sm:flex-initial" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
            <Button size="sm" className="h-9 flex-1 sm:flex-initial" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1" />Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const ariaLabel = `${meta.dateStr || (item.service_date || meta.label)} — ${fmtMoney(item.line_total)}${!readOnly ? ', tap to edit' : ''}`;

  return (
    <div
      className={`group rounded-lg border bg-card p-3 sm:p-3 transition-colors ${!readOnly ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1' : ''}`}
      onClick={() => !readOnly && setEditing(true)}
      role={!readOnly ? 'button' : undefined}
      tabIndex={!readOnly ? 0 : undefined}
      aria-label={!readOnly ? ariaLabel : undefined}
      onKeyDown={e => {
        if (readOnly) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-md p-2 shrink-0 ${isShift ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Row 1: Date + amount */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold truncate">
              {meta.dateStr || (item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d, yyyy') : meta.label)}
            </p>
            <p className="text-base font-semibold tabular-nums shrink-0">{fmtMoney(item.line_total)}</p>
          </div>

          {/* Row 2: Label + time */}
          {meta.dateStr && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {meta.label}{meta.timeStr ? ` · ${meta.timeStr}` : ''}
            </p>
          )}

          {/* Row 3: Rate breakdown + chips */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap min-w-0">
              {item.line_kind === 'overtime' ? (
                <>
                  <span className="tabular-nums">{formatHours(item.qty)} × {fmtMoney(item.unit_rate)}/hr</span>
                  <span className="inline-flex items-center rounded-full bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] text-[10px] font-medium px-1.5 py-0.5">Overtime</span>
                  {isOtOverride && (
                    <span
                      className="inline-flex items-center rounded-full bg-[hsl(var(--warning))]/25 text-[hsl(var(--warning))] text-[10px] font-semibold px-1.5 py-0.5"
                      title={`Clinic rate is ${fmtMoney(Number(clinicOvertimeRate))}/hr`}
                    >
                      Rate override
                    </span>
                  )}
                </>
              ) : isShift && (item.line_kind === 'regular' || (item.qty !== 1 && !item.line_kind)) ? (
                <>
                  <span className="tabular-nums">{item.qty}h × {fmtMoney(item.unit_rate)}/hr</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">Hourly</span>
                </>
              ) : (
                <>
                  <span className="tabular-nums">{item.qty} × {fmtMoney(item.unit_rate)}</span>
                  {isShift && (
                    <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5">Flat</span>
                  )}
                </>
              )}
              {isShift && item.line_kind !== 'overtime' && <span className="text-primary text-[10px]">· from shift ✓</span>}
            </div>
            {!readOnly && (
              <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 sm:h-7 sm:w-7"
                  onClick={e => { e.stopPropagation(); setEditing(true); }}
                  aria-label="Edit line item"
                >
                  <Pencil className="h-4 w-4 sm:h-3 sm:w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
                  onClick={async e => { e.stopPropagation(); if (onDelete) await onDelete(); }}
                  aria-label="Delete line item"
                >
                  <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                </Button>
              </div>
            )}
          </div>
          {showSyncHint && !readOnly && (
            <p className="text-[10.5px] text-muted-foreground/80 italic mt-1.5">Editing this updates the shift on your schedule.</p>
          )}
          {!readOnly && isShift && item.line_kind !== 'overtime' && !hasOvertime && onAddOvertime && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2 text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/10"
                onClick={e => { e.stopPropagation(); onAddOvertime(); }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add overtime
              </Button>
            </div>
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
  const [newQty, setNewQty] = useState<string>('1');
  const [newRate, setNewRate] = useState<string>('');
  const showPayment = externalPaymentOpen ?? false;
  const setShowPayment = onPaymentDialogChange ?? (() => {});
  const [showPayNudge, setShowPayNudge] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!(invoice.notes && invoice.notes.length > 0));

  // ─── Undo stack for line-item mutations ───
  // Each entry holds a snapshot of items + invoice totals taken BEFORE the action.
  type UndoEntry = {
    label: string;
    items: any[];
    total_amount: number;
    balance_due: number;
  };
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  // Reset stack when switching invoices
  useEffect(() => { setUndoStack([]); }, [invoice.id]);

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

  // Capture a snapshot of the current line items + invoice totals BEFORE a mutation.
  const pushUndo = (label: string) => {
    setUndoStack(s => [
      ...s,
      {
        label,
        items: items.map((x: any) => ({ ...x })),
        total_amount: invoice.total_amount,
        balance_due: invoice.balance_due,
      },
    ].slice(-20)); // cap depth
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || isUndoing) return;
    const snap = undoStack[undoStack.length - 1];
    setIsUndoing(true);
    try {
      const currentById = new Map(items.map((x: any) => [x.id, x]));
      const snapById = new Map(snap.items.map((x: any) => [x.id, x]));

      // Delete items that exist now but didn't in the snapshot.
      for (const cur of items) {
        if (!snapById.has(cur.id) && onDeleteLineItem) {
          await onDeleteLineItem(cur.id);
        }
      }
      // Re-add items that were in the snapshot but are missing now.
      for (const prev of snap.items) {
        if (!currentById.has(prev.id) && onAddLineItem) {
          const { id, created_at, updated_at, user_id, ...rest } = prev;
          await onAddLineItem(rest);
        }
      }
      // Update items present in both whose contents changed.
      for (const prev of snap.items) {
        const cur = currentById.get(prev.id);
        if (cur && onUpdateLineItem) {
          const changed =
            cur.description !== prev.description ||
            cur.service_date !== prev.service_date ||
            Number(cur.qty) !== Number(prev.qty) ||
            Number(cur.unit_rate) !== Number(prev.unit_rate) ||
            Number(cur.line_total) !== Number(prev.line_total);
          if (changed) await onUpdateLineItem(prev);
        }
      }
      await onUpdateInvoice({
        ...invoice,
        total_amount: snap.total_amount,
        balance_due: snap.balance_due,
      });
      setUndoStack(s => s.slice(0, -1));
      toast.success(`Undid: ${snap.label}`);
    } catch (e) {
      console.error('Undo failed', e);
      toast.error('Could not undo that action');
    } finally {
      setIsUndoing(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!newDesc.trim() || !onAddLineItem) return;
    pushUndo('Add custom line');
    const qtyN = parseFloat(newQty) || 0;
    const rateN = parseFloat(newRate) || 0;
    const lineTotal = qtyN * rateN;
    await onAddLineItem({
      invoice_id: invoice.id,
      shift_id: null,
      description: newDesc,
      service_date: newDate || null,
      qty: qtyN,
      unit_rate: rateN,
      line_total: lineTotal,
    });
    setNewDesc(''); setNewDate(''); setNewQty('1'); setNewRate(''); setShowAddLine(false);
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
      paid_at: isPaidNow
        ? (payment?.payment_date
            ? new Date(`${payment.payment_date}T12:00:00Z`).toISOString()
            : new Date().toISOString())
        : invoice.paid_at,
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
          ) : (() => {
            const baseLines = items.filter((x: any) => x.line_kind !== 'overtime');
            const overtimeByShift = new Map<string, any>();
            items.forEach((x: any) => {
              if (x.line_kind === 'overtime' && x.shift_id) overtimeByShift.set(x.shift_id, x);
            });
            // Orphan overtime (no matching base line) renders standalone.
            const baseShiftIds = new Set(baseLines.map((b: any) => b.shift_id).filter(Boolean));
            const orphanOvertime = items.filter((x: any) =>
              x.line_kind === 'overtime' && (!x.shift_id || !baseShiftIds.has(x.shift_id))
            );

            const renderCard = (li: any) => {
              const shift = li.shift_id ? shifts.find(s => s.id === li.shift_id) : null;
              const syncEligible = canSyncShiftForLine(invoice.status, li.line_kind, li.shift_id);
              const hasOvertime = li.shift_id ? overtimeByShift.has(li.shift_id) : false;

              return (
                <ShiftLineItemCard
                  key={li.id}
                  item={li}
                  readOnly={readOnly}
                  showSyncHint={syncEligible}
                  hasOvertime={hasOvertime}
                  clinicOvertimeRate={shift ? (terms.find(t => t.facility_id === shift.facility_id)?.overtime_rate ?? null) : null}
                  onAddOvertime={shift && !readOnly && onAddLineItem ? async () => {
                    pushUndo('Add overtime');
                    const clinicTerms = terms.find(t => t.facility_id === shift.facility_id);
                    const clinicOtRate = clinicTerms?.overtime_rate != null ? Number(clinicTerms.overtime_rate) : 0;
                    const savedOtRate = profile?.default_overtime_rate != null ? Number(profile.default_overtime_rate) : 0;
                    const shiftHourly = shift.rate_kind === 'hourly' && shift.hourly_rate ? Number(shift.hourly_rate) : 0;
                    const defaultRate = clinicOtRate > 0 ? clinicOtRate : (savedOtRate > 0 ? savedOtRate : shiftHourly);
                    const otQty = 0.25;
                    const otTotal = Math.round(otQty * defaultRate * 100) / 100;
                    await onAddLineItem({
                      invoice_id: invoice.id,
                      shift_id: shift.id,
                      description: `Overtime`,
                      service_date: li.service_date || formatYMDInTz(shift.start_datetime, resolveShiftTz(shift as any, facility as any, profile as any)),
                      qty: otQty,
                      unit_rate: defaultRate,
                      line_total: otTotal,
                      line_kind: 'overtime',
                    });
                    const newTotal = total + otTotal;
                    await onUpdateInvoice({ ...invoice, total_amount: newTotal, balance_due: newTotal });
                    // Mirror to shift immediately
                    await updateShift({ ...shift, overtime_hours: otQty, overtime_rate: defaultRate });
                    await onAddActivity({
                      invoice_id: invoice.id,
                      action: 'overtime_added',
                      description: `Added overtime line — 15 min${defaultRate ? ` × ${fmtMoney(defaultRate)}/hr` : ''}`,
                    });
                    toast.success('Overtime added (15 min) — adjust qty or rate as needed');
                  } : undefined}
                  onUpdate={async (updated) => {
                    if (!onUpdateLineItem) return;
                    if (!isUndoing) pushUndo('Edit line item');
                    await onUpdateLineItem(updated);
                    const nextItems = items.map((x: any) => x.id === updated.id ? updated : x);
                    const newTotal = Math.round(nextItems.reduce((s: number, x: any) => s + (Number(x.line_total) || 0), 0) * 100) / 100;
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
            };

            return (
              <>
                {baseLines.map((base: any) => {
                  const ot = base.shift_id ? overtimeByShift.get(base.shift_id) : null;
                  if (!ot) return renderCard(base);
                  // Nest overtime visually under its shift card.
                  return (
                    <div key={base.id} className="space-y-1.5">
                      {renderCard(base)}
                      <div className="ml-4 pl-3 border-l-2 border-[hsl(var(--warning))]/40">
                        {renderCard(ot)}
                      </div>
                    </div>
                  );
                })}
                {orphanOvertime.map((ot: any) => renderCard(ot))}
              </>
            );
          })()}


          {!readOnly && !showAddLine && (
            <div className="flex justify-start pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-9 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add custom line
              </Button>
            </div>
          )}

          {!readOnly && showAddLine && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div>
                <Label htmlFor="new-line-desc" className="text-[10px] text-muted-foreground uppercase">Description</Label>
                <Input id="new-line-desc" placeholder="What's this for?" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="h-9 text-sm mt-1" autoFocus />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="new-line-date" className="text-[10px] text-muted-foreground uppercase">Date</Label>
                  <Input id="new-line-date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label htmlFor="new-line-qty" className="text-[10px] text-muted-foreground uppercase">Qty</Label>
                  <Input id="new-line-qty" type="number" inputMode="decimal" placeholder="1" value={newQty} onChange={e => setNewQty(e.target.value)} className="h-9 text-sm mt-1" min={0} step="0.25" aria-label="Quantity" />
                </div>
                <div>
                  <Label htmlFor="new-line-rate" className="text-[10px] text-muted-foreground uppercase">Rate</Label>
                  <Input id="new-line-rate" type="number" inputMode="decimal" placeholder="0.00" value={newRate} onChange={e => setNewRate(e.target.value)} className="h-9 text-sm mt-1" min={0} step="0.01" aria-label="Rate" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-1 border-t">
                <span className="text-sm text-muted-foreground">
                  Line total: <span className="font-semibold text-foreground tabular-nums">{fmtMoney((parseFloat(newQty) || 0) * (parseFloat(newRate) || 0))}</span>
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="outline" onClick={() => setShowAddLine(false)} className="h-9 flex-1 sm:flex-initial">Cancel</Button>
                  <Button size="sm" onClick={handleAddLineItem} className="h-9 flex-1 sm:flex-initial" disabled={!newDesc.trim()}>Add</Button>
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
