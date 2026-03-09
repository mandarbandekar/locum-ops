import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { computeInvoiceStatus, generateInvoiceNumber } from '@/lib/businessLogic';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const { invoices, facilities, shifts, addInvoice } = useData();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create Invoice
        </Button>
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
              <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Facility</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Invoice Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
              <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Balance</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayInvoices.map(inv => (
              <tr
                key={inv.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/invoices/${inv.id}`)}
              >
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
              </tr>
            ))}
            {displayInvoices.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No invoices</td></tr>
            )}
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
