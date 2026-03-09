import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { computeInvoiceStatus, generateInvoiceNumber } from '@/lib/businessLogic';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const { invoices, facilities, shifts, addInvoice, deleteInvoice } = useData();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const displayInvoices = invoices
    .map(inv => ({ ...inv, computedStatus: computeInvoiceStatus(inv) }))
    .filter(inv => statusFilter === 'all' || inv.computedStatus === statusFilter)
    .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Facility</th>
            <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Period</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            <th className="w-10" />
          </tr></thead>
          <tbody>
            {displayInvoices.map(inv => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td className="p-3 font-medium">{inv.invoice_number}</td>
                <td className="p-3">{getFacilityName(inv.facility_id)}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {format(new Date(inv.period_start), 'MMM d')} - {format(new Date(inv.period_end), 'MMM d, yyyy')}
                </td>
                <td className="p-3 font-medium">${inv.total_amount.toLocaleString()}</td>
                <td className="p-3"><StatusBadge status={inv.computedStatus} /></td>
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {inv.invoice_number}?</AlertDialogTitle>
                        <AlertDialogDescription>This invoice and its line items will be permanently removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteInvoice(inv.id); toast.success('Invoice deleted'); }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {displayInvoices.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No invoices</td></tr>}
          </tbody>
        </table>
      </div>

      <CreateInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />
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
