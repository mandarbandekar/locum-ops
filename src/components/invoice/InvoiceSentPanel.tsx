import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, Download, Link2, Copy, RefreshCw, Loader2, Undo2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { toast } from 'sonner';
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

interface InvoiceSentPanelProps {
  invoice: any;
  items: any[];
  invoicePayments: any[];
  facility: any;
  billingNameTo: string;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddPayment: (payment: any) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
}

export function InvoiceSentPanel({ invoice, items, invoicePayments, facility, billingNameTo, onUpdateInvoice, onAddPayment, onAddActivity }: InvoiceSentPanelProps) {
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
    await onUpdateInvoice({ ...invoice, share_token: token, share_token_created_at: new Date().toISOString(), share_token_revoked_at: null });
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
    await onUpdateInvoice({ ...invoice, share_token: token, share_token_created_at: new Date().toISOString(), share_token_revoked_at: null });
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

  const handleRevertToDraft = async () => {
    await onUpdateInvoice({ ...invoice, status: 'draft', sent_at: null, paid_at: null });
    await onAddActivity({ invoice_id: invoice.id, action: 'reverted_to_draft', description: 'Invoice reverted to draft for editing' });
    toast.success('Invoice moved to Draft — you can now edit it');
  };

  return (
    <div className="space-y-3">
      {/* Send & Share — shown first */}
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Send & Share</CardTitle></CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <Button className="w-full h-auto py-2.5 px-4 text-sm justify-center text-center whitespace-normal" onClick={() => toast.info('Email sending coming soon!')}>
            <Send className="mr-2 h-4 w-4 shrink-0" />
            <span>Send invoice to {billingNameTo || 'Billing Contact'} at {facility?.name || 'Facility'} via email</span>
          </Button>
          <Button variant="outline" className="w-full text-sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </Button>
          {hasShareLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-xs font-mono break-all">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyShareLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
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
            <Button variant="outline" className="w-full text-sm" onClick={handleCreateShareLink} disabled={shareLoading}>
              <Link2 className="mr-2 h-4 w-4" /> Create Share Link
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Balance Due & Record Payment */}
      <Card className={isPaid ? 'border-primary/30 bg-primary/5' : computedStatus === 'overdue' ? 'border-destructive/30 bg-destructive/5' : ''}>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className={`font-bold text-2xl ${computedStatus === 'overdue' ? 'text-destructive' : computedStatus === 'paid' ? 'text-primary' : 'text-foreground'}`}>
              ${(invoice.balance_due ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Invoice Date</p>
              <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Due Date</p>
              <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Sent</p>
              <p className="font-medium">{invoice.sent_at ? format(new Date(invoice.sent_at), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>
          {!isPaid && (
            <Button className="w-full" onClick={() => setShowPayment(true)}>
              <DollarSign className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
          {isPaid && (
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Paid in full
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Send & Share</CardTitle></CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <Button variant="outline" className="w-full justify-start text-sm" onClick={() => toast.info('Email sending coming soon!')}>
            <Send className="mr-2 h-4 w-4" />
            Email to {billingNameTo || '—'}
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Beta</Badge>
          </Button>
          <Button variant="outline" className="w-full text-sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </Button>
          {hasShareLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-xs font-mono break-all">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyShareLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
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
            <Button variant="outline" className="w-full text-sm" onClick={handleCreateShareLink} disabled={shareLoading}>
              <Link2 className="mr-2 h-4 w-4" /> Create Share Link
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Line Items (read-only) */}
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Line Items ({items.length})</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          <table className="w-full text-sm">
            <tbody>
              {items.map((li: any) => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-1.5">{li.description}{li.shift_id && <span className="text-xs text-primary ml-1">↗ shift</span>}</td>
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
          <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Payment History</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {invoicePayments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
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

      {/* Revert action */}
      <Card className="border-dashed">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Need to make changes? Move back to draft to edit.</p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleRevertToDraft}>
            <Undo2 className="mr-2 h-3.5 w-3.5" /> Revert to Draft & Edit
          </Button>
          {(invoice.status === 'paid' || invoice.status === 'partial') && (
            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={async () => {
              await onUpdateInvoice({ ...invoice, status: 'sent', paid_at: null });
              await onAddActivity({ invoice_id: invoice.id, action: 'reverted_to_sent', description: 'Payment status reset — moved back to Sent' });
              toast.success('Payment status reset');
            }}>
              Reset Payment Status
            </Button>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog open={showPayment} onOpenChange={setShowPayment} balanceDue={invoice.balance_due} onRecord={handleRecordPayment} />
    </div>
  );
}
