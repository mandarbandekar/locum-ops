import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Download, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { buildChecklistItems } from '@/components/invoice/ReadyToSendChecklist';
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

interface InvoiceActionBarProps {
  invoice: any;
  items: any[];
  facility: any;
  profile: any;
  dueDate: string;
  onSave: () => Promise<void>;
  onUpdateInvoice: (invoice: any) => Promise<void>;
  onAddActivity: (activity: any) => Promise<void>;
}

export function InvoiceActionBar({ invoice, items, facility, profile, dueDate, onSave, onUpdateInvoice, onAddActivity }: InvoiceActionBarProps) {
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const isDraft = invoice.status === 'draft';

  if (!isDraft) return null;

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
    toast.success('Invoice ready to send');
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('PDF downloaded');
    } catch { toast.error('PDF generation failed'); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1 text-sm font-medium text-muted-foreground">
          Total: <span className="text-foreground font-bold text-base">${items.reduce((s: number, li: any) => s + li.line_total, 0).toLocaleString()}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button size="sm" onClick={handleProceedToSend} disabled={sending}>
          {sending ? 'Processing…' : <>Ready to Send <ArrowRight className="ml-1 h-3.5 w-3.5" /></>}
        </Button>
      </div>
    </div>
  );
}
