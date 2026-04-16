import { Check, AlertTriangle } from 'lucide-react';

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
] as const;

function getStepIndex(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent' || status === 'partial' || status === 'overdue') return 1;
  if (status === 'paid') return 2;
  return 0;
}

interface InvoiceStepperProps {
  status: string;
}

/**
 * Passive progress indicator. No clicks, no transitions — status changes
 * happen via the Action Zone (`InvoiceActionBar`).
 */
export function InvoiceStepper({ status }: InvoiceStepperProps) {
  const currentIdx = getStepIndex(status);
  const isOverdue = status === 'overdue';

  return (
    <div className="flex items-center gap-0 w-full" role="status" aria-label={`Invoice status: ${status}`}>
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx || (status === 'paid' && i <= 2);
        const isCurrent = i === currentIdx && status !== 'paid';
        const showOverdue = isOverdue && isCurrent;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex items-center gap-2.5">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 ${
                showOverdue ? 'bg-destructive/15 text-destructive border-2 border-destructive' :
                isComplete ? 'bg-primary text-primary-foreground' :
                isCurrent ? 'bg-primary/15 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {showOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> :
                 isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${
                showOverdue ? 'text-destructive' :
                isComplete ? 'text-primary' :
                isCurrent ? 'text-foreground' :
                'text-muted-foreground'
              }`}>
                {showOverdue && i === 1 ? 'Overdue' : step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded ${
                showOverdue && i === currentIdx ? 'bg-destructive/30' :
                isComplete ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
