import { FileText, Send, CheckCircle, AlertTriangle, Check } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import type { Invoice, InvoicePayment } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  invoice: Invoice;
  payments: InvoicePayment[];
  computedStatus: string; // 'draft' | 'sent' | 'partial' | 'paid' | 'overdue'
}

/** Format a date string to 'MMM d' without timezone shift. */
function formatShort(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, , mm, dd] = m;
    return `${MONTHS[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`;
  }
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return null;
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

type NodeState = 'complete' | 'current' | 'pending' | 'alert';

interface StepNode {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  date: string | null;
  state: NodeState;
  sublabel?: string;
}

/**
 * Visual status timeline for an invoice — Draft → Sent → Paid (or Overdue).
 * Replaces the plain stepper with dated milestones and an overdue variant.
 */
export function InvoiceStatusTimeline({ invoice, payments, computedStatus }: Props) {
  const isOverdue = computedStatus === 'overdue';
  const isPaid = computedStatus === 'paid';
  const isPartial = computedStatus === 'partial';
  const isSent = computedStatus !== 'draft';

  const draftDate = formatShort(invoice.invoice_date);
  const sentDate = formatShort(invoice.sent_at);
  const paidDate = formatShort(invoice.paid_at);
  const dueDate = formatShort(invoice.due_date);

  // Overdue sub-label: "Nd past due"
  let overdueSublabel: string | undefined;
  if (isOverdue && invoice.due_date) {
    const days = Math.abs(differenceInCalendarDays(new Date(invoice.due_date), new Date()));
    overdueSublabel = `${days}d past due`;
  }

  // Partial sub-label: paid total / invoice total
  let partialSublabel: string | undefined;
  if (isPartial) {
    const paidAmt = payments.reduce((s, p) => s + (p.amount || 0), 0);
    partialSublabel = `Partial · $${paidAmt.toLocaleString()} of $${(invoice.total_amount ?? 0).toLocaleString()}`;
  }

  const steps: StepNode[] = [
    {
      key: 'draft',
      label: 'Draft',
      icon: FileText,
      date: draftDate,
      state: 'complete', // Always complete — every invoice was created as a draft.
    },
    {
      key: 'sent',
      label: 'Sent',
      icon: Send,
      date: sentDate ?? (isSent ? null : null),
      state: isSent ? 'complete' : 'current',
      sublabel: !isSent ? 'Not sent yet' : undefined,
    },
    {
      key: 'final',
      label: isOverdue ? 'Overdue' : 'Paid',
      icon: isOverdue ? AlertTriangle : CheckCircle,
      date: isPaid ? paidDate : isOverdue ? null : dueDate,
      state: isPaid ? 'complete' : isOverdue ? 'alert' : isSent ? 'current' : 'pending',
      sublabel: isOverdue
        ? overdueSublabel
        : isPartial
          ? partialSublabel
          : !isPaid && isSent && dueDate
            ? `Due ${dueDate}`
            : undefined,
    },
  ];

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 w-full"
      role="status"
      aria-label={`Invoice status timeline: ${computedStatus}`}
    >
      {steps.map((step, i) => {
        const Icon = step.icon;
        const next = steps[i + 1];
        const isLast = i === steps.length - 1;

        // Connector style: destructive tint leading into an alert node; primary when leaving a complete node; muted otherwise.
        const connectorClass =
          next?.state === 'alert'
            ? 'bg-destructive/40'
            : step.state === 'complete'
              ? 'bg-primary'
              : 'bg-border';

        const circleClass = cn(
          'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 transition-colors',
          step.state === 'complete' && 'bg-primary text-primary-foreground',
          step.state === 'current' && 'bg-primary/15 text-primary border-2 border-primary',
          step.state === 'pending' && 'bg-muted text-muted-foreground',
          step.state === 'alert' && 'bg-destructive/15 text-destructive border-2 border-destructive',
        );

        const labelClass = cn(
          'text-sm font-medium leading-tight',
          step.state === 'complete' && 'text-foreground',
          step.state === 'current' && 'text-foreground',
          step.state === 'pending' && 'text-muted-foreground',
          step.state === 'alert' && 'text-destructive',
        );

        const sublabelClass = cn(
          'text-[11px] mt-0.5 leading-tight',
          step.state === 'alert' ? 'text-destructive font-medium' : 'text-muted-foreground',
        );

        return (
          <div key={step.key} className="flex sm:flex-1 items-start gap-3 sm:gap-2">
            <div className="flex flex-col items-center shrink-0">
              <div className={circleClass}>
                {step.state === 'complete' ? (
                  <Check className="h-4 w-4" />
                ) : step.state === 'alert' ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
            </div>
            <div className="flex-1 sm:flex-none min-w-0">
              <div className={labelClass}>{step.label}</div>
              {(step.date || step.sublabel) && (
                <div className={sublabelClass}>
                  {step.date && <span>{step.date}</span>}
                  {step.date && step.sublabel && <span> · </span>}
                  {step.sublabel && <span>{step.sublabel}</span>}
                </div>
              )}
            </div>
            {!isLast && (
              <div className="hidden sm:flex flex-1 items-center pt-4">
                <div className={cn('h-0.5 w-full rounded', connectorClass)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
