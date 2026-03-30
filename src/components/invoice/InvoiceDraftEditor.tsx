import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Check, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';

interface DraftEditorProps {
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
}

export function InvoiceDraftEditor({
  invoice, items, facility, profile, billingNameTo, billingEmailTo,
  onUpdateInvoice, onAddLineItem, onUpdateLineItem, onDeleteLineItem,
  onAddActivity, onOpenBillingDialog,
}: DraftEditorProps) {
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

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [lineItemsOpen, setLineItemsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);

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
    const checklist = buildChecklistItems(profile, { ...invoice, due_date: dueDate || invoice.due_date }, items, facility);
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

  return {
    invoiceNumber, invoiceDate, dueDate, notes, total,
    handleSave, handleProceedToSend, saving,
    editPanel: (
      <div className="space-y-3">
        {/* From / Bill To summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3 text-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">From</p>
              {profile?.company_name ? (
                <div>
                  <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                  <p className="text-muted-foreground">{profile.company_name}</p>
                </div>
              ) : (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate('/settings/invoice-profile')}>
                  + Add business info
                </Button>
              )}
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3 text-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Bill To</p>
              <p className="font-medium">{facility?.name || 'Unknown'}</p>
              {billingNameTo ? (
                <p className="text-muted-foreground text-xs">{billingNameTo}{billingEmailTo ? ` · ${billingEmailTo}` : ''}</p>
              ) : (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenBillingDialog}>
                  + Add billing contact
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Details - collapsible */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/30 transition-colors text-sm font-semibold">
            {detailsOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            Invoice Details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
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
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Line Items - collapsible */}
        <Collapsible open={lineItemsOpen} onOpenChange={setLineItemsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/30 transition-colors text-sm font-semibold">
            <div className="flex items-center gap-2">
              {lineItemsOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              Line Items ({items.length})
            </div>
            <span className="text-sm font-bold text-primary">${total.toLocaleString()}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1.5 font-medium text-muted-foreground text-xs">Description</th>
                    <th className="pb-1.5 font-medium text-muted-foreground text-xs w-24">Date</th>
                    <th className="pb-1.5 font-medium text-muted-foreground text-xs w-16 text-right">Qty</th>
                    <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Rate</th>
                    <th className="pb-1.5 font-medium text-muted-foreground text-xs w-20 text-right">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
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
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-muted-foreground text-xs">No line items yet</td></tr>
                  )}
                </tbody>
              </table>

              {showAddLine ? (
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
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowAddLine(true)} className="h-7 mt-2">
                  <Plus className="h-3 w-3 mr-1" /> Add Line Item
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes - collapsible */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/30 transition-colors text-sm font-semibold">
            {notesOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            Notes / Memo
            {notes && !notesOpen && <span className="text-xs text-muted-foreground font-normal ml-2 truncate max-w-48">{notes}</span>}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any notes or payment terms..." rows={3} className="text-sm" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
  };
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
