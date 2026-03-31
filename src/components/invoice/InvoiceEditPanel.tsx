import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

/** Convert any date value to a timezone-safe YYYY-MM-DD string for storage.
 *  Avoids the UTC-midnight shift that `new Date('YYYY-MM-DD').toISOString()` causes. */
function toDateOnlyISO(v: string | Date | null | undefined): string {
  if (!v) return '';
  if (typeof v === 'string') {
    // Already a date-only string
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // ISO string or other – extract local date parts
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

interface InvoiceEditPanelProps {
  invoice: any;
  items: any[];
  facility: any;
  profile: any;
  billingNameTo: string;
  billingEmailTo: string;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddLineItem: (item: any) => Promise<void>;
  onUpdateLineItem: (item: any) => Promise<void>;
  onDeleteLineItem: (id: string) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
  onOpenBillingDialog: () => void;
  // Expose save and state for the action bar
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onInvoiceFieldChange?: (fields: { invoiceNumber: string; invoiceDate: string; dueDate: string; notes: string; total: number }) => void;
}

export function InvoiceEditPanel({
  invoice, items, facility, profile, billingNameTo, billingEmailTo,
  onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem, onAddActivity,
  onOpenBillingDialog, onSaveRef, onInvoiceFieldChange,
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

  const total = items.reduce((s: number, li: any) => s + li.line_total, 0);

  // Expose fields for live preview (in useEffect to avoid infinite render loop)
  useEffect(() => {
    onInvoiceFieldChange?.({ invoiceNumber, invoiceDate, dueDate, notes, total });
  }, [invoiceNumber, invoiceDate, dueDate, notes, total]);

  // Auto-save draft on field changes (debounced)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
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
  }, [invoiceNumber, invoiceDate, dueDate, notes, total]);

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

  if (onSaveRef) {
    onSaveRef.current = handleSave;
  }

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
    <div className="space-y-3">
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
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Line Items</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
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
              {items.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground text-xs">No line items yet — click Add to start</td></tr>}
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
            <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground text-base">${total.toLocaleString()}</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes / Memo</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank you note, etc." rows={2} className="text-sm mt-1.5" />
        </CardContent>
      </Card>
    </div>
  );
}
