import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Send, CheckCircle, DollarSign, Trash2, Pencil, Check, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, lineItems, facilities, contacts, updateInvoice, addEmailLog, deleteLineItem } = useData();

  const invoice = invoices.find(i => i.id === id);
  if (!invoice) return <div className="p-6">Invoice not found. <Button variant="link" onClick={() => navigate('/invoices')}>Back</Button></div>;

  const items = lineItems.filter(li => li.invoice_id === id);
  const facility = facilities.find(c => c.id === invoice.facility_id);
  const contact = contacts.find(c => c.facility_id === invoice.facility_id && c.is_primary);
  const computedStatus = computeInvoiceStatus(invoice);

  const handleSendInvoice = () => {
    const now = new Date().toISOString();
    const dueDate = addDays(new Date(), 14).toISOString();
    updateInvoice({ ...invoice, status: 'sent', sent_at: now, due_date: dueDate });
    addEmailLog({
      facility_id: invoice.facility_id,
      type: 'invoice',
      subject: `Invoice ${invoice.invoice_number}`,
      body: `Invoice for $${invoice.total_amount} — due ${format(addDays(new Date(), 14), 'MMM d, yyyy')}`,
      recipients: contact?.email || '',
      sent_at: now,
    });
    toast.success('Invoice sent');
  };

  const handleMarkPaid = () => {
    updateInvoice({ ...invoice, status: 'paid', paid_at: new Date().toISOString() });
    toast.success('Invoice marked as paid');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="page-title">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">{facility?.name}</p>
        </div>
        <StatusBadge status={computedStatus} className="ml-3 text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-16">Qty</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-24">Rate</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground w-24">Total</th>
                  {invoice.status === 'draft' && <th className="w-10" />}
                </tr></thead>
                <tbody>
                  {items.map(li => (
                    <tr key={li.id} className="border-b last:border-0">
                      <td className="py-2">{li.description}</td>
                      <td className="py-2 text-right">{li.qty}</td>
                      <td className="py-2 text-right">${li.unit_rate}</td>
                      <td className="py-2 text-right font-medium">${li.line_total}</td>
                      {invoice.status === 'draft' && (
                        <td className="py-2">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { deleteLineItem(li.id); toast.success('Removed'); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No line items</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={3} className="pt-3 text-right font-semibold">Total</td>
                    <td className="pt-3 text-right font-bold text-lg">${invoice.total_amount.toLocaleString()}</td>
                    {invoice.status === 'draft' && <td />}
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span>{format(new Date(invoice.period_start), 'MMM d')} - {format(new Date(invoice.period_end), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{invoice.sent_at ? format(new Date(invoice.sent_at), 'MMM d, yyyy') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due</span>
                <span>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM d, yyyy') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span>{contact?.email || '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === 'draft' && (
                <Button onClick={handleSendInvoice} className="w-full">
                  <Send className="mr-2 h-4 w-4" /> Send Invoice
                </Button>
              )}
              {(invoice.status === 'sent' || computedStatus === 'overdue') && (
                <Button onClick={handleMarkPaid} className="w-full" variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
                </Button>
              )}
              {invoice.status === 'paid' && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-success/10 text-success text-sm">
                  <CheckCircle className="h-4 w-4" /> Paid in full
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
