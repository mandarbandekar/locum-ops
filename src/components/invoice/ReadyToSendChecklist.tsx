import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
  helperText: string;
}

export function ReadyToSendChecklist({ items, onFix, onFixBilling }: { items: ChecklistItem[]; onFix?: () => void; onFixBilling?: () => void }) {
  const allRequired = items.filter(i => i.required).every(i => i.complete);
  const allComplete = items.every(i => i.complete);
  const navigate = useNavigate();

  if (allComplete) return null;

  return (
    <Card className={`border ${allRequired ? 'border-primary/30 bg-primary/5' : 'border-warning/30 bg-warning/5'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {allRequired ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
          {allRequired ? 'This invoice is ready to send.' : 'Complete the items below to continue.'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map(item => (
          <div key={item.key} className="flex items-start gap-2 text-sm">
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div>
              <span className={item.complete ? 'text-muted-foreground line-through' : 'text-foreground'}>
                {item.label}
              </span>
              {!item.complete && (
                <p className="text-xs text-muted-foreground">{item.helperText}</p>
              )}
            </div>
            {!item.complete && item.key.startsWith('sender_') && (
              <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-xs" onClick={() => navigate('/settings/invoice-profile')}>
                Go to Settings
              </Button>
            )}
          </div>
        ))}
        {!allRequired && onFix && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onFix}>
            Fix missing items
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function buildChecklistItems(
  profile: { first_name: string; last_name: string; company_name: string; company_address: string } | null,
  invoice: { due_date: string | null; notes: string },
  lineItems: any[],
  facility: { name: string; invoice_name_to?: string; invoice_email_to?: string } | null | undefined
): ChecklistItem[] {
  return [
    { key: 'sender_first_name', label: 'Sender first name added', complete: !!(profile?.first_name), required: true, helperText: 'Add your first name in Invoice Profile settings' },
    { key: 'sender_last_name', label: 'Sender last name added', complete: !!(profile?.last_name), required: true, helperText: 'Add your last name in Invoice Profile settings' },
    { key: 'sender_company', label: 'Company name added', complete: !!(profile?.company_name), required: true, helperText: 'Add your company name in Invoice Profile settings' },
    { key: 'sender_address', label: 'Business address added', complete: !!(profile?.company_address), required: true, helperText: 'Add your business address to send invoices' },
    { key: 'bill_to', label: 'Bill-to contact added', complete: !!(facility?.name), required: true, helperText: 'Select a facility for this invoice' },
    { key: 'billing_name', label: 'Billing contact name added', complete: !!(facility?.invoice_name_to), required: true, helperText: 'Add a billing contact name in Invoice Billing Contact and Settings' },
    { key: 'billing_email', label: 'Billing email added', complete: !!(facility?.invoice_email_to), required: true, helperText: 'Add a billing email in Invoice Billing Contact and Settings' },
    { key: 'line_items', label: 'At least 1 line item', complete: lineItems.length > 0, required: true, helperText: 'Add at least one line item' },
    { key: 'due_date', label: 'Due date added', complete: !!(invoice.due_date), required: true, helperText: 'Set a due date for this invoice' },
  ];
}
