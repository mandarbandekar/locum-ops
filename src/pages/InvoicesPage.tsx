import { useState, useRef, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, AlertTriangle, Send, FileEdit, CheckCircle, Clock } from 'lucide-react';
import { startOfMonth, isAfter, isBefore, startOfDay } from 'date-fns';
import { computeInvoiceStatus, generateInvoiceNumber } from '@/lib/businessLogic';
import { toast } from 'sonner';
import { BulkInvoiceDialog } from '@/components/invoice/BulkInvoiceDialog';
import { InvoiceEmptyState } from '@/components/invoice/InvoiceEmptyState';
import { InvoiceStatusGroup } from '@/components/invoice/InvoiceStatusGroup';
import { InvoiceSummaryStrip } from '@/components/invoice/InvoiceSummaryStrip';
import { InvoiceWorkflowHint } from '@/components/invoice/InvoiceWorkflowHint';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InvoicesPage() {
  const { invoices, facilities, shifts, addInvoice, deleteInvoice, dataLoading } = useData();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refs for scroll-to
  const overdueRef = useRef<HTMLDivElement>(null);
  const awaitingRef = useRef<HTMLDivElement>(null);
  const draftsRef = useRef<HTMLDivElement>(null);
  const paidRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((group: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement>> = {
      overdue: overdueRef, awaiting: awaitingRef, drafts: draftsRef, paid: paidRef,
    };
    map[group]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const allInvoices = safeInvoices
    .map(inv => ({ ...inv, computedStatus: computeInvoiceStatus(inv) }))
    .sort((a, b) => new Date(a.invoice_date || a.period_end).getTime() - new Date(b.invoice_date || b.period_end).getTime());

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await deleteInvoice(id);
    }
    toast.success(`${selected.size} invoice(s) deleted`);
    setSelected(new Set());
    setShowDeleteConfirm(false);
  };

  // Group by status in priority order
  const overdue = allInvoices.filter(i => i.computedStatus === 'overdue');
  const sent = allInvoices.filter(i => i.computedStatus === 'sent');
  const partial = allInvoices.filter(i => i.computedStatus === 'partial');
  const allDrafts = allInvoices
    .filter(i => i.computedStatus === 'draft')
    .sort((a, b) => new Date(a.invoice_date || a.period_end).getTime() - new Date(b.invoice_date || b.period_end).getTime());
  const today = startOfDay(new Date());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const readyToReview = allDrafts.filter(i => !isAfter(new Date(i.period_end), endOfToday));
  const upcoming = allDrafts.filter(i => isAfter(new Date(i.period_end), endOfToday));
  const paid = allInvoices.filter(i => i.computedStatus === 'paid');

  const monthStart = startOfMonth(new Date());
  const paidThisMonth = paid.filter(i => i.paid_at && isAfter(new Date(i.paid_at), monthStart));

  const sumTotal = (arr: typeof allInvoices) => arr.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const sumBalance = (arr: typeof allInvoices) => arr.reduce((s, i) => s + (i.balance_due ?? 0), 0);

  if (dataLoading) {
    return (
      <div className="p-6">
        <h1 className="page-title mb-4">Invoices</h1>
        <p className="text-muted-foreground">Loading invoices…</p>
      </div>
    );
  }

  if (safeInvoices.length === 0) {
    return (
      <div>
        <div className="page-header flex-col sm:flex-row gap-3">
          <h1 className="page-title">Invoices</h1>
        </div>
        <InvoiceEmptyState onCreateManual={() => setShowCreate(true)} />
        <BulkInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex-col sm:flex-row gap-3">
        <h1 className="page-title">Invoices</h1>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-1 h-4 w-4" /> Create Manual Invoice
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <InvoiceSummaryStrip
        overdue={{ count: overdue.length, total: sumBalance(overdue) }}
        awaiting={{ count: [...sent, ...partial].length, total: sumBalance([...sent, ...partial]) }}
        readyToReview={{ count: readyToReview.length, total: sumTotal(readyToReview) }}
        upcomingCount={upcoming.length}
        paidThisMonth={{ count: paidThisMonth.length, total: sumTotal(paidThisMonth) }}
        onScrollTo={scrollTo}
      />

      {/* Workflow Hint */}
      <div className="my-3">
        <InvoiceWorkflowHint />
      </div>

      {readyToReview.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <FileEdit className="h-4 w-4 shrink-0" />
            You have {readyToReview.length} invoice{readyToReview.length !== 1 ? 's' : ''} ready to review — review and send to get paid.
          </div>
          <Button size="sm" className="shrink-0" onClick={() => navigate(`/invoices/${readyToReview[0].id}`)}>
            Review Next →
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div ref={overdueRef}>
          <InvoiceStatusGroup
            title="Overdue"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            invoices={overdue}
            selected={selected}
            onToggleSelect={toggleSelect}
            onDelete={deleteInvoice}
            getFacilityName={getFacilityName}
            emptyMessage="No overdue invoices — you're all caught up!"
            defaultOpen={true}
            headerRight={overdue.length > 0 ? (
              <span className="text-sm font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
                ${sumBalance(overdue).toLocaleString()} overdue
              </span>
            ) : undefined}
            alertBanner={overdue.length > 0 ? (
              <div className="flex items-center gap-2 px-5 py-3 text-sm text-destructive bg-destructive/5 border-t border-destructive/10">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                You have ${sumBalance(overdue).toLocaleString()} overdue across {overdue.length} invoice{overdue.length !== 1 ? 's' : ''}. Follow up with facilities to collect payment.
              </div>
            ) : undefined}
          />
        </div>

        <div ref={awaitingRef}>
          <InvoiceStatusGroup
            title="Sent & Awaiting Payment"
            icon={<Send className="h-4 w-4 text-blue-500" />}
            invoices={[...sent, ...partial]}
            selected={selected}
            onToggleSelect={toggleSelect}
            onDelete={deleteInvoice}
            getFacilityName={getFacilityName}
            emptyMessage="No invoices awaiting payment right now."
            defaultOpen={true}
            headerRight={[...sent, ...partial].length > 0 ? (
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                ${sumBalance([...sent, ...partial]).toLocaleString()} outstanding
              </span>
            ) : undefined}
          />
        </div>

        <div ref={draftsRef}>
          <InvoiceStatusGroup
            title="Ready to Review"
            icon={<FileEdit className="h-4 w-4 text-amber-500" />}
            invoices={readyToReview}
            selected={selected}
            onToggleSelect={toggleSelect}
            onDelete={deleteInvoice}
            getFacilityName={getFacilityName}
            emptyMessage="Invoices are auto-generated from your shifts — no need to create them manually. They'll appear here once shifts are completed."
            defaultOpen={true}
            groupByFacility={true}
            headerRight={readyToReview.length > 0 ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/invoices/${readyToReview[0].id}`)}>
                Review & Send
              </Button>
            ) : undefined}
          />
        </div>

        <div>
          <InvoiceStatusGroup
            title="Upcoming"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            invoices={upcoming}
            selected={selected}
            onToggleSelect={toggleSelect}
            onDelete={deleteInvoice}
            getFacilityName={getFacilityName}
            emptyMessage="No upcoming invoices."
            defaultOpen={false}
            groupByFacility={true}
            alertBanner={upcoming.length > 0 ? (
              <div className="flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground bg-muted/30 border-t">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                These invoices will be ready to review after the shifts are completed.
              </div>
            ) : undefined}
          />
        </div>

        <div ref={paidRef}>
          <InvoiceStatusGroup
            title="Paid"
            icon={<CheckCircle className="h-4 w-4 text-primary" />}
            invoices={paid}
            selected={selected}
            onToggleSelect={toggleSelect}
            onDelete={deleteInvoice}
            getFacilityName={getFacilityName}
            emptyMessage="No paid invoices yet."
            defaultOpen={false}
            headerRight={paidThisMonth.length > 0 ? (
              <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                ${sumTotal(paidThisMonth).toLocaleString()} this month
              </span>
            ) : undefined}
          />
        </div>
      </div>

      <BulkInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />

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
