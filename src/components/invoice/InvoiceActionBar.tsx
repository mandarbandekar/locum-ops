import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Download, Loader2, DollarSign, Link2, Copy, CheckCircle,
  Send, MoreHorizontal, Undo2, AlertTriangle, Mail,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
import { supabase } from '@/integrations/supabase/client';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { isInvoiceOverdue } from '@/lib/invoiceHelpers';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface InvoiceActionBarProps {
  invoice: any;
  items: any[];
  facility: any;
  profile: any;
  dueDate: string;
  billingNameTo?: string;
  onSave: () => Promise<void>;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
  onRecordPayment?: () => void;
  userId?: string;
  onOpenCompose?: () => void;
}

export function InvoiceActionBar({
  invoice, items, facility, profile, dueDate, billingNameTo,
  onSave, onUpdateInvoice, onAddActivity, onRecordPayment, onOpenCompose,
}: InvoiceActionBarProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [confirmAlreadySentOpen, setConfirmAlreadySentOpen] = useState(false);
  const [confirmRevertOpen, setConfirmRevertOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  const computedStatus = computeInvoiceStatus(invoice);
  const isDraft = invoice.status === 'draft';
  const isPaid = invoice.status === 'paid';
  const overdue = isInvoiceOverdue(invoice);
  const hasShareLink = !!invoice.share_token && !invoice.share_token_revoked_at;
  const shareUrl = hasShareLink ? `${window.location.origin}/invoice/public/${invoice.share_token}` : '';
  const draftTotal = items.reduce((s: number, li: any) => s + li.line_total, 0);

  const handleProceedAlreadySent = async () => {
    const checklist = buildChecklistItems(profile, { ...invoice, due_date: dueDate || invoice.due_date }, items, facility);
    const incomplete = checklist.filter((i: any) => i.required && !i.complete);
    if (incomplete.length > 0) {
      toast.error(`Complete required items: ${incomplete.map((i: any) => i.label).join(', ')}`);
      return;
    }
    setSending(true);
    await onSave();
    await onUpdateInvoice({
      ...invoice,
      total_amount: draftTotal,
      balance_due: draftTotal,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'marked_sent_manually', description: 'Invoice marked as sent manually (sent outside Locum Ops)' });
    setSending(false);
    toast.success('Invoice marked as sent');
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('PDF downloaded');
    } catch { toast.error('PDF generation failed'); }
    finally { setPdfLoading(false); }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
  };

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    const token = crypto.randomUUID();
    await onUpdateInvoice({ ...invoice, share_token: token, share_token_created_at: new Date().toISOString(), share_token_revoked_at: null });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_created', description: 'Share link created' });
    setShareLoading(false);
    toast.success('Share link created');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/invoice/public/${token}`);
      toast.success('Share link copied');
    }
  };

  const handleRevertToDraft = async () => {
    await onUpdateInvoice({ ...invoice, status: 'draft', sent_at: null, paid_at: null });
    await onAddActivity({ invoice_id: invoice.id, action: 'reverted_to_draft', description: 'Invoice reverted to draft' });
    toast.success('Invoice moved back to Draft');
  };

  // ─── Status chip (left side) ───────────────────────────────
  const renderStatusChip = () => {
    if (isDraft) {
      return (
        <div className="text-sm text-muted-foreground shrink-0">
          Total: <span className="text-foreground font-bold text-base">${draftTotal.toLocaleString()}</span>
        </div>
      );
    }
    if (isPaid) {
      return (
        <div className="flex items-center gap-1.5 text-primary shrink-0 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Paid in full{invoice.paid_at ? ` · ${format(new Date(invoice.paid_at), 'MMM d')}` : ''}</span>
        </div>
      );
    }
    if (overdue) {
      const daysOverdue = invoice.due_date ? differenceInDays(new Date(), new Date(invoice.due_date)) : 0;
      return (
        <div className="flex items-center gap-2 shrink-0 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">
            ${(invoice.balance_due ?? 0).toLocaleString()} · {daysOverdue}d overdue
          </span>
        </div>
      );
    }
    // sent or partial
    return (
      <div className="flex items-center gap-2 shrink-0 text-sm">
        <CheckCircle className="h-4 w-4 text-primary" />
        <div className="leading-tight">
          <div className="font-medium text-foreground">
            ${(invoice.balance_due ?? 0).toLocaleString()} due
            {invoice.status === 'partial' && <span className="text-muted-foreground font-normal"> · partial</span>}
          </div>
          {invoice.sent_at && (
            <div className="text-[11px] text-muted-foreground">
              Sent to {billingNameTo || 'billing contact'} · {format(new Date(invoice.sent_at), 'MMM d')}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Right-side actions ────────────────────────────────────
  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleDownloadPdf} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </DropdownMenuItem>
        {!isDraft && (
          hasShareLink ? (
            <DropdownMenuItem onClick={handleCopyShareLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy share link
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleCreateShareLink} disabled={shareLoading}>
              <Link2 className="mr-2 h-4 w-4" /> Create share link
            </DropdownMenuItem>
          )
        )}
        {!isDraft && !isPaid && (
          <DropdownMenuItem onClick={onOpenCompose}>
            <Mail className="mr-2 h-4 w-4" /> Resend email
          </DropdownMenuItem>
        )}
        {!isDraft && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirmRevertOpen(true)}>
              <Undo2 className="mr-2 h-4 w-4" /> Revert to Draft
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-3">
        {renderStatusChip()}

        <div className="flex-1" />

        {/* DRAFT */}
        {isDraft && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading} className="shrink-0">
              {pdfLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Download Invoice PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmAlreadySentOpen(true)} disabled={sending} className="shrink-0">
              <span className="hidden sm:inline">I already sent this</span>
              <span className="sm:hidden">Sent</span>
            </Button>
            <Button size="sm" onClick={() => setComingSoonOpen(true)} className="shrink-0">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send to clinic
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </>
        )}

        {/* SENT / PARTIAL */}
        {!isDraft && !isPaid && !overdue && (
          <>
            {moreMenu}
            <Button size="sm" onClick={onRecordPayment} className="shrink-0">
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              Record payment
            </Button>
          </>
        )}

        {/* OVERDUE */}
        {overdue && !isPaid && (
          <>
            {moreMenu}
            <Button variant="outline" size="sm" onClick={onOpenCompose} className="shrink-0">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send follow-up</span>
              <span className="sm:hidden">Follow-up</span>
            </Button>
            <Button size="sm" onClick={onRecordPayment} className="shrink-0">
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Record payment</span>
              <span className="sm:hidden">Pay</span>
            </Button>
          </>
        )}

        {/* PAID */}
        {isPaid && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading} className="shrink-0">
              {pdfLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Download Invoice PDF</span>
            </Button>
            {hasShareLink ? (
              <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="shrink-0">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy link</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} disabled={shareLoading} className="shrink-0">
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share link</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setConfirmRevertOpen(true)}>
                  <Undo2 className="mr-2 h-4 w-4" /> Revert to Draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* I already sent it confirmation */}
      <AlertDialog open={confirmAlreadySentOpen} onOpenChange={setConfirmAlreadySentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as already sent?</AlertDialogTitle>
            <AlertDialogDescription>
              Use this only if you've already sent this invoice from your own email. The invoice will move to "Sent" without sending any email from Locum Ops.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setConfirmAlreadySentOpen(false); await handleProceedAlreadySent(); }}>
              Yes, mark as sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert to Draft confirmation */}
      <AlertDialog open={confirmRevertOpen} onOpenChange={setConfirmRevertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the invoice back to Draft so you can edit it. The sent date and payment status will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setConfirmRevertOpen(false); await handleRevertToDraft(); }}>
              Revert to Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coming soon dialog for Send to clinic */}
      <AlertDialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Coming soon</AlertDialogTitle>
            <AlertDialogDescription>
              Email functionality is coming soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setComingSoonOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
