import { format } from 'date-fns';
import { Card } from '@/components/ui/card';

interface PreviewProps {
  sender: {
    firstName: string;
    lastName: string;
    company: string;
    address: string;
    email?: string | null;
    phone?: string | null;
  };
  billTo: {
    facilityName: string;
    contactName?: string;
    email?: string;
    address?: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  lineItems: { description: string; service_date: string | null; qty: number; unit_rate: number; line_total: number; shift_id?: string | null }[];
  total: number;
  balanceDue: number;
  notes: string;
}

export function InvoicePreview({ sender, billTo, invoiceNumber, invoiceDate, dueDate, lineItems, total, balanceDue, notes }: PreviewProps) {
  return (
    <Card className="bg-card border shadow-sm overflow-hidden">
      <div className="p-6 space-y-6" id="invoice-preview">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-foreground">{sender.company || 'Your Company'}</h2>
            <p className="text-sm text-muted-foreground">{sender.firstName} {sender.lastName}</p>
            {sender.address && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{sender.address}</p>
            )}
            {sender.email && <p className="text-xs text-muted-foreground">{sender.email}</p>}
            {sender.phone && <p className="text-xs text-muted-foreground">{sender.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary tracking-tight">INVOICE</p>
            <p className="text-sm font-medium text-foreground mt-1">{invoiceNumber}</p>
          </div>
        </div>

        {/* Bill-to + dates */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
            <p className="text-sm font-medium">{billTo.facilityName}</p>
            {billTo.contactName && <p className="text-xs text-muted-foreground">{billTo.contactName}</p>}
            {billTo.email && <p className="text-xs text-muted-foreground">{billTo.email}</p>}
            {billTo.address && <p className="text-xs text-muted-foreground">{billTo.address}</p>}
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm font-medium">{invoiceDate ? format(new Date(invoiceDate.length === 10 ? invoiceDate + 'T00:00:00' : invoiceDate), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">{dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2.5 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground w-24">Date</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-12">Qty</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-20">Rate</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2.5">{li.description}</td>
                  <td className="p-2.5 text-muted-foreground">{li.service_date ? format(new Date(li.service_date + 'T00:00:00'), 'MMM d') : '—'}</td>
                  <td className="p-2.5 text-right">{li.qty}</td>
                  <td className="p-2.5 text-right">${li.unit_rate.toLocaleString()}</td>
                  <td className="p-2.5 text-right font-medium">${li.line_total.toLocaleString()}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Amount Due</span>
              <span className="text-primary">${balanceDue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{notes}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
