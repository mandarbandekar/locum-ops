import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { Download, Loader2 } from 'lucide-react';

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [facility, setFacility] = useState<any>(null);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [billingContact, setBillingContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    loadInvoice();
  }, [token]);

  async function loadInvoice() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-invoice?token=${encodeURIComponent(token!)}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) {
        setError('This invoice link is no longer available.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInvoice(data.invoice);
      setLineItems(data.line_items || []);
      setFacility(data.facility);
      setSenderProfile(data.sender);
      setBillingContact(data.billing_contact);
    } catch {
      setError('This invoice link is no longer available.');
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invoice-pdf?token=${encodeURIComponent(token!)}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${invoice?.invoice_number || 'invoice'}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // fallback to print
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Invoice Unavailable</h1>
          <p className="text-muted-foreground">{error || 'This invoice link is no longer available.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-lg font-semibold text-foreground">Invoice {invoice.invoice_number}</h1>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
        <div id="invoice-print-area">
          <InvoicePreview
            sender={{
              firstName: senderProfile?.first_name || '',
              lastName: senderProfile?.last_name || '',
              company: senderProfile?.company_name || '',
              address: senderProfile?.company_address || '',
              email: senderProfile?.invoice_email,
              phone: senderProfile?.invoice_phone,
            }}
            billTo={{
              facilityName: facility?.name || 'Unknown',
              contactName: billingContact?.name || facility?.invoice_name_to,
              email: billingContact?.email || facility?.invoice_email_to,
              address: facility?.address,
            }}
            invoiceNumber={invoice.invoice_number}
            invoiceDate={invoice.invoice_date}
            dueDate={invoice.due_date}
            lineItems={lineItems}
            total={invoice.total_amount}
            balanceDue={invoice.balance_due}
            notes={invoice.notes}
          />
        </div>
      </div>
    </div>
  );
}
