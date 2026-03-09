import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [facility, setFacility] = useState<any>(null);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [billingContact, setBillingContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    loadInvoice();
  }, [token]);

  async function loadInvoice() {
    try {
      // Fetch invoice by share_token — requires a public-facing edge function
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

  const handlePrint = () => window.print();

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
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Download PDF
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
              contactName: billingContact?.name,
              email: billingContact?.email,
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
