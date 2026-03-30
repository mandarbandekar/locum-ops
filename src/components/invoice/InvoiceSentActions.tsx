import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Link2, Copy, RefreshCw, Send, DollarSign, CheckCircle, Undo2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { RecordPaymentDialog } from '@/components/invoice/RecordPaymentDialog';
import { supabase } from '@/integrations/supabase/client';

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

interface SentActionsProps {
  invoice: any;
  items: any[];
  invoicePayments: any[];
  facility: any;
  billingNameTo: string;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddPayment: (payment: any) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
}

export function InvoiceSentActions({
  invoice, items, invoicePayments, facility, billingNameTo,
  onUpdateInvoice, onAddPayment, onAddActivity,
}: SentActionsProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const computedStatus = computeInvoiceStatus(invoice);
  const isPaid = invoice.status === 'paid';
  const hasShareLink = !!invoice.share_token && !invoice.share_token_revoked_at;
  const shareUrl = hasShareLink ? `${window.location.origin}/invoice/public/${invoice.share_token}` : '';

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    const token = crypto.randomUUID();
    await onUpdateInvoice({
      ...invoice,
      share_token: token,
      share_token_created_at: new Date().toISOString(),
      share_token_revoked_at: null,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_created', description: 'Share link created' });
    setShareLoading(false);
    toast.success('Share link created');
  };

  const handleRevokeShareLink = async () => {
    await onUpdateInvoice({ ...invoice, share_token_revoked_at: new Date().toISOString() });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_revoked', description: 'Share link revoked' });
    toast.success('Share link revoked');
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleRegenerateShareLink = async () => {
    setShareLoading(true);
    const token = crypto.randomUUID();
    await onUpdateInvoice({
      ...invoice,
      share_token: token,
      share_token_created_at: new Date().toISOString(),
      share_token_revoked_at: null,
    });
    await onAddActivity({ invoice_id: invoice.id, action: 'share_link_regenerated', description: 'Share link regenerated (old link invalidated)' });
    setShareLoading(false);
    toast.success('New share link generated');
  };

  const handleRecordPayment = async (payment: any) => {
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
      description: isPaidNow ? `Paid in full — $${payment.amount}` : `Payment recorded — $${payment.amount} via ${payment.method}`,
    });
    toast.success(isPaidNow ? 'Invoice paid in full!' : 'Payment recorded');
  };

  return (
    <div className="space-y-4">
      {/* Balance Due */}
      <Card className={isPaid ? 'border-primary/30 bg-primary/5' : ''}>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className={`font-bold text-2xl ${computedStatus === 'overdue' ? 'text-destructive' : computedStatus === 'paid' ? 'text-primary' : 'text-foreground'}`}>
              ${invoice.balance_due.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Invoiced</p>
              <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Due</p>
              <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Sent</p>
              <p className="font-medium">{invoice.sent_at ? format(new Date(invoice.sent_at), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>
          {isPaid && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
              <CheckCircle className="h-4 w-4" /> Paid in full
            </div>
          )}
          {!isPaid && (
            <Button className="w-full" size="lg" onClick={() => setShowPayment(true)}>
              <DollarSign className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>

          <Button variant="outline" className="w-full justify-start" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </Button>

          {hasShareLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted text-xs font-mono break-all">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyShareLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateShareLink} disabled={shareLoading}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> New
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive text-xs" onClick={handleRevokeShareLink}>
                Revoke Link
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full justify-start" onClick={handleCreateShareLink} disabled={shareLoading}>
              <Link2 className="mr-2 h-4 w-4" /> Create Share Link
            </Button>
          )}

          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Email sending coming soon!')}>
            <Send className="mr-2 h-4 w-4" />
            Email to {billingNameTo || '—'}
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Beta</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Status Changes */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={async () => {
              await onUpdateInvoice({ ...invoice, status: 'draft', sent_at: null, paid_at: null });
              await onAddActivity({ invoice_id: invoice.id, action: 'reverted_to_draft', description: 'Invoice reverted to draft for editing' });
              toast.success('Moved to Draft — you can now edit');
            }}
          >
            <Undo2 className="mr-2 h-3.5 w-3.5" /> Revert to Draft
          </Button>
          {(invoice.status === 'paid' || invoice.status === 'partial') && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-8"
              onClick={async () => {
                await onUpdateInvoice({ ...invoice, status: 'sent', paid_at: null });
                await onAddActivity({ invoice_id: invoice.id, action: 'reverted_to_sent', description: 'Payment status reset' });
                toast.success('Payment status reset');
              }}
            >
              <Undo2 className="mr-2 h-3.5 w-3.5" /> Reset Payment Status
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Line Items (read-only) */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items ({items.length})</p>
          <table className="w-full text-sm">
            <tbody>
              {items.map((li: any) => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-1.5">{li.description}{li.shift_id && <span className="text-xs text-primary ml-1">↗</span>}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{li.qty} × ${li.unit_rate}</td>
                  <td className="py-1.5 text-right font-medium w-20">${li.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoicePayments.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</p>
            <div className="space-y-2">
              {invoicePayments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm p-2.5 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">${p.amount.toLocaleString()} via {p.method}</p>
                    <p className="text-xs text-muted-foreground">{p.account}{p.memo ? ` — ${p.memo}` : ''}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(p.payment_date), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RecordPaymentDialog open={showPayment} onOpenChange={setShowPayment} balanceDue={invoice.balance_due} onRecord={handleRecordPayment} />
    </div>
  );
}
