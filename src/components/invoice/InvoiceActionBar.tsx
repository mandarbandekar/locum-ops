import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Download, Loader2, Save, DollarSign, Link2, Copy, CheckCircle, Send, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
import { supabase } from '@/integrations/supabase/client';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

export function InvoiceActionBar({ invoice, items, facility, profile, dueDate, billingNameTo, onSave, onUpdateInvoice, onAddActivity, onRecordPayment, userId, onOpenCompose }: InvoiceActionBarProps) {
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDraft = invoice.status === 'draft';
  const computedStatus = computeInvoiceStatus(invoice);
  const isPaid = invoice.status === 'paid';
  const hasShareLink = !!invoice.share_token && !invoice.share_token_revoked_at;
  const shareUrl = hasShareLink ? `${window.location.origin}/invoice/public/${invoice.share_token}` : '';

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  };

  const handleProceedToSend = async () => {
    const checklist = buildChecklistItems(profile, { ...invoice, due_date: dueDate || invoice.due_date }, items, facility);
    const incomplete = checklist.filter((i: any) => i.required && !i.complete);
    if (incomplete.length > 0) {
      toast.error(`Complete required items: ${incomplete.map((i: any) => i.label).join(', ')}`);
      return;
    }
    setSending(true);
    await onSave();
    const total = items.reduce((s: number, li: any) => s + li.line_total, 0);
    await onUpdateInvoice({
      ...invoice,
      total_amount: total,
      balance_due: total,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'marked_sent', description: 'Invoice marked as sent' });
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
    toast.success('Link copied to clipboard');
  };

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    const token = crypto.randomUUID();
    await onUpdateInvoice({ ...invoice, share_token: token, share_token_created_at: new Date().toISOString(), share_token_revoked_at: null });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_created', description: 'Share link created' });
    setShareLoading(false);
    toast.success('Share link created');
  };

  const total = items.reduce((s: number, li: any) => s + li.line_total, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-3 overflow-x-auto">
        {/* Total — always visible */}
        <div className="shrink-0 text-sm font-medium text-muted-foreground">
          {isPaid ? (
            <span className="flex items-center gap-1.5 text-primary"><CheckCircle className="h-4 w-4" /> Paid</span>
          ) : (
            <>Total: <span className="text-foreground font-bold text-base">${(isDraft ? total : (invoice.balance_due ?? 0)).toLocaleString()}</span></>
          )}
        </div>

        <div className="flex-1" />

        {/* PDF — always available */}
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading} className="shrink-0">
          {pdfLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
          <span className="hidden sm:inline">PDF</span>
        </Button>

        {/* Draft actions */}
        {isDraft && (
          <>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="shrink-0">
              <Save className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </Button>
            <Button size="sm" onClick={handleProceedToSend} disabled={sending} className="shrink-0">
              {sending ? 'Processing…' : <><span className="hidden sm:inline">Mark as Sent</span><span className="sm:hidden">Send</span> <ArrowRight className="ml-1 h-3.5 w-3.5" /></>}
            </Button>
          </>
        )}

        {/* Sent / Overdue / Partial actions */}
        {!isDraft && !isPaid && (
          <>
            {hasShareLink ? (
              <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="shrink-0">
                <Copy className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy Link</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} disabled={shareLoading} className="shrink-0">
                <Link2 className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            <Button size="sm" onClick={onRecordPayment} className="shrink-0">
              <DollarSign className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Record Payment</span>
              <span className="sm:hidden">Pay</span>
            </Button>
          </>
        )}

        {/* Paid actions */}
        {isPaid && (
          <>
            {hasShareLink ? (
              <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="shrink-0">
                <Copy className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy Link</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} disabled={shareLoading} className="shrink-0">
                <Link2 className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
