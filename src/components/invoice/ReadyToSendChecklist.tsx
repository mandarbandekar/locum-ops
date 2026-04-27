import { useState } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, UserCog, Building2, Calendar, ListPlus, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
  helperText: string;
}

const SHORT_LABELS: Record<string, string> = {
  sender_first_name: 'First name',
  sender_last_name: 'Last name',
  sender_company: 'Company name',
  sender_address: 'Business address',
  bill_to: 'Facility',
  billing_name: 'Contact name',
  billing_email: 'Email',
  line_items: 'Line item',
  due_date: 'Due date',
};

type GroupKey = 'sender' | 'billing' | 'facility' | 'line_items' | 'due_date';

interface ActionGroup {
  key: GroupKey;
  icon: typeof UserCog;
  title: string;
  missingFields: string[];
  ctaLabel: string;
  onClick: () => void;
}

interface Props {
  items: ChecklistItem[];
  onFix?: () => void;
  onFixBilling?: () => void;
}

/**
 * Smoothly scrolls to a target element and applies a brief highlight ring
 * so the user immediately sees where to take action.
 */
function scrollAndHighlight(selector: string, focusInput = false) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-md', 'transition-shadow');
  if (focusInput) {
    const input = el.querySelector('input, button, [tabindex]') as HTMLElement | null;
    setTimeout(() => input?.focus(), 350);
  }
  setTimeout(() => {
    el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
  }, 1800);
}

export function ReadyToSendChecklist({ items, onFixBilling }: Props) {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);

  const required = items.filter(i => i.required);
  const completedCount = required.filter(i => i.complete).length;
  const totalCount = required.length;
  const allComplete = completedCount === totalCount;

  if (allComplete) return null;

  // Group missing fields by destination
  const missing = required.filter(i => !i.complete);

  const senderMissing = missing.filter(i => i.key.startsWith('sender_'));
  const billingMissing = missing.filter(i => i.key === 'billing_name' || i.key === 'billing_email');
  const facilityMissing = missing.filter(i => i.key === 'bill_to');
  const lineItemsMissing = missing.find(i => i.key === 'line_items');
  const dueDateMissing = missing.find(i => i.key === 'due_date');

  const groups: ActionGroup[] = [];

  if (senderMissing.length) {
    groups.push({
      key: 'sender',
      icon: UserCog,
      title: 'Complete your sender profile',
      missingFields: senderMissing.map(i => SHORT_LABELS[i.key] || i.label),
      ctaLabel: 'Open Invoice Profile',
      onClick: () => navigate('/settings/invoice-profile'),
    });
  }

  if (facilityMissing.length) {
    groups.push({
      key: 'facility',
      icon: Building2,
      title: 'Select a facility for this invoice',
      missingFields: ['Facility (bill-to)'],
      ctaLabel: 'Choose facility',
      onClick: () => navigate('/invoices'),
    });
  }

  if (billingMissing.length) {
    groups.push({
      key: 'billing',
      icon: Mail,
      title: 'Add billing contact for this facility',
      missingFields: billingMissing.map(i => SHORT_LABELS[i.key] || i.label),
      ctaLabel: 'Add billing contact',
      onClick: () => onFixBilling?.(),
    });
  }

  if (lineItemsMissing) {
    groups.push({
      key: 'line_items',
      icon: ListPlus,
      title: 'Add at least one line item',
      missingFields: ['Line item'],
      ctaLabel: 'Add line item',
      onClick: () => scrollAndHighlight('[data-line-items-section]', true),
    });
  }

  if (dueDateMissing) {
    groups.push({
      key: 'due_date',
      icon: Calendar,
      title: 'Set a due date',
      missingFields: ['Due date'],
      ctaLabel: 'Pick due date',
      onClick: () => scrollAndHighlight('[data-due-date-field]', true),
    });
  }

  const completedItems = required.filter(i => i.complete);
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {missing.length} item{missing.length === 1 ? '' : 's'} left before you can send this invoice
          </CardTitle>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {completedCount} of {totalCount} ready
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {groups.map((group, idx) => {
          const Icon = group.icon;
          return (
            <div
              key={group.key}
              className="flex items-start gap-3 rounded-md border bg-background p-3"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-warning/15 text-warning shrink-0 text-xs font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{group.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Missing: {group.missingFields.join(', ')}
                </p>
              </div>
              <Button
                size="sm"
                variant="default"
                className="shrink-0 gap-1 h-8 text-xs"
                onClick={group.onClick}
              >
                {group.ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {/* Collapsible completed items */}
        {completedItems.length > 0 && (
          <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 px-1">
                <ChevronDown className={`h-3 w-3 transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
                Show {completedItems.length} completed item{completedItems.length === 1 ? '' : 's'}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-2 pl-1">
                {completedItems.map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="line-through">{item.label}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
    { key: 'billing_name', label: 'Billing contact name added', complete: !!(facility?.invoice_name_to), required: true, helperText: 'Add a billing contact name' },
    { key: 'billing_email', label: 'Billing email added', complete: !!(facility?.invoice_email_to), required: true, helperText: 'Add a billing email' },
    { key: 'line_items', label: 'At least 1 line item', complete: lineItems.length > 0, required: true, helperText: 'Add at least one line item' },
    { key: 'due_date', label: 'Due date added', complete: !!(invoice.due_date), required: true, helperText: 'Set a due date for this invoice' },
  ];
}
