import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Layers } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { computeInvoiceStatus, generateInvoiceNumber } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { BulkInvoiceDialog } from '@/components/invoice/BulkInvoiceDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InvoicesPage() {
  const { invoices, facilities, shifts, addInvoice, deleteInvoice } = useData();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayInvoices = invoices
    .map(inv => ({ ...inv, computedStatus: computeInvoiceStatus(inv) }))
    .filter(inv => statusFilter === 'all' || inv.computedStatus === statusFilter)
    .sort((a, b) => new Date(b.invoice_date || b.period_end).getTime() - new Date(a.invoice_date || a.period_end).getTime());

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      paid: 'bg-primary/15 text-primary',
      overdue: 'bg-destructive/15 text-destructive',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      partial: 'Partially Paid',
      paid: 'Paid',
      overdue: 'Overdue',
    };
    return <Badge className={`${styles[status] || styles.draft} text-xs font-medium`}>{labels[status] || status}</Badge>;
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === displayInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayInvoices.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await deleteInvoice(id);
    }
    toast.success(`${selected.size} invoice(s) deleted`);
    setSelected(new Set());
    setShowDeleteConfirm(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowBulkCreate(true)}>
            <Layers className="mr-1 h-4 w-4" /> Bulk Invoice
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'draft', 'sent', 'partial', 'paid', 'overdue'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
            className="h-7 text-xs"
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1 opacity-60">
                ({invoices.filter(i => (s === 'overdue' ? computeInvoiceStatus(i) : i.status) === s).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10">
                <Checkbox
                  checked={displayInvoices.length > 0 && selected.size === displayInvoices.length}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Facility</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Invoice Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
              <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Balance</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {displayInvoices.map(inv => (
              <tr
                key={inv.id}
                className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selected.has(inv.id) ? 'bg-primary/5' : ''}`}
                onClick={() => navigate(`/invoices/${inv.id}`)}
              >
                <td className="p-3" onClick={e => toggleSelect(inv.id, e)}>
                  <Checkbox checked={selected.has(inv.id)} />
                </td>
                <td className="p-3 font-medium">{inv.invoice_number}</td>
                <td className="p-3">{getFacilityName(inv.facility_id)}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">
                  {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                </td>
                <td className="p-3 text-right font-medium">${inv.total_amount.toLocaleString()}</td>
                <td className="p-3 text-right hidden sm:table-cell">
                  {inv.balance_due > 0 ? <span className="font-medium">${inv.balance_due.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3">{getStatusBadge(inv.computedStatus)}</td>
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <AlertDialog>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" asChild>
                      <AlertDialogAction className="bg-transparent hover:bg-transparent p-0" onClick={e => e.preventDefault()}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </AlertDialogAction>
                    </Button>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {displayInvoices.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No invoices</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Bulk delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} invoice(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected invoices and all their line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { facilities, shifts, invoices, addInvoice } = useData();
  const navigate = useNavigate();
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleCreate = async () => {
    if (!facilityId) return;
    const completedShifts = shifts.filter(s =>
      s.facility_id === facilityId &&
      s.status === 'completed' &&
      new Date(s.start_datetime) >= new Date(periodStart) &&
      new Date(s.end_datetime) <= new Date(periodEnd + 'T23:59:59')
    );

    const lineItems = completedShifts.map(s => ({
      shift_id: s.id,
      description: `Shift - ${format(new Date(s.start_datetime), 'MMM d, yyyy')} (${format(new Date(s.start_datetime), 'h:mm a')} - ${format(new Date(s.end_datetime), 'h:mm a')})`,
      service_date: new Date(s.start_datetime).toISOString().split('T')[0],
      qty: 1,
      unit_rate: s.rate_applied,
      line_total: s.rate_applied,
    }));

    const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);

    try {
      const facility = facilities.find(f => f.id === facilityId);
      const dueDays = (facility as any)?.invoice_due_days || 15;
      const invoice = await addInvoice(
        {
          facility_id: facilityId,
          invoice_number: generateInvoiceNumber(invoices, facility?.invoice_prefix || 'INV'),
          invoice_date: new Date().toISOString(),
          period_start: new Date(periodStart).toISOString(),
          period_end: new Date(periodEnd).toISOString(),
          total_amount: total,
          balance_due: total,
          status: 'draft',
          sent_at: null,
          paid_at: null,
          due_date: new Date(new Date(periodEnd).getTime() + dueDays * 86400000).toISOString(),
          notes: '',
          share_token: null,
          share_token_created_at: null,
          share_token_revoked_at: null,
        },
        lineItems
      );

      toast.success(`Invoice created with ${lineItems.length} line items`);
      onOpenChange(false);
      navigate(`/invoices/${invoice.id}`);
    } catch { /* error toast handled in DataContext */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {facilities.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Period Start</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
            <div><Label>Period End</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Completed shifts in this range will be auto-added as line items.</p>
          <Button onClick={handleCreate} className="w-full">Create Invoice</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
