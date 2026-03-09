import { Check } from 'lucide-react';

const STEPS = [
  { key: 'draft', label: 'Draft & Review' },
  { key: 'sent', label: 'Send' },
  { key: 'paid', label: 'Payment' },
] as const;

function getStepIndex(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent' || status === 'partial' || status === 'overdue') return 1;
  if (status === 'paid') return 2;
  return 0;
}

export function InvoiceStepper({ status }: { status: string }) {
  const currentIdx = getStepIndex(status);

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx || (status === 'paid' && i <= 2);
        const isCurrent = i === currentIdx && status !== 'paid';
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex items-center gap-2.5">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors shrink-0 ${
                isComplete ? 'bg-primary text-primary-foreground' :
                isCurrent ? 'bg-primary/15 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${
                isComplete ? 'text-primary' :
                isCurrent ? 'text-foreground' :
                'text-muted-foreground'
              }`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded ${isComplete ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
