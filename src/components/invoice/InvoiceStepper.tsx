import { Check, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STEPS = [
  { key: 'draft', label: 'Draft & Review', description: 'Edit invoice details' },
  { key: 'sent', label: 'Sent', description: 'Invoice sent to client' },
  { key: 'paid', label: 'Paid', description: 'Payment received' },
] as const;

function getStepIndex(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'sent' || status === 'partial' || status === 'overdue') return 1;
  if (status === 'paid') return 2;
  return 0;
}

interface InvoiceStepperProps {
  status: string;
  onStepClick?: (stepKey: string) => void;
}

export function InvoiceStepper({ status, onStepClick }: InvoiceStepperProps) {
  const currentIdx = getStepIndex(status);
  const isOverdue = status === 'overdue';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0 w-full">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIdx || (status === 'paid' && i <= 2);
          const isCurrent = i === currentIdx && status !== 'paid';
          const isClickable = !!onStepClick && i !== currentIdx;
          const showOverdue = isOverdue && isCurrent;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-2.5 transition-all ${
                      isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    }`}
                    onClick={() => isClickable && onStepClick(step.key)}
                    disabled={!isClickable}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors shrink-0 ${
                      showOverdue ? 'bg-destructive/15 text-destructive border-2 border-destructive' :
                      isComplete ? 'bg-primary text-primary-foreground' :
                      isCurrent ? 'bg-primary/15 text-primary border-2 border-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {showOverdue ? <AlertTriangle className="h-4 w-4" /> :
                       isComplete ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="text-left">
                      <span className={`text-sm font-medium whitespace-nowrap block leading-tight ${
                        showOverdue ? 'text-destructive' :
                        isComplete ? 'text-primary' :
                        isCurrent ? 'text-foreground' :
                        'text-muted-foreground'
                      }`}>{step.label}</span>
                      {showOverdue && (
                        <span className="text-[10px] text-destructive font-medium">Overdue</span>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isClickable ? `Move to ${step.label}` : step.description}
                </TooltipContent>
              </Tooltip>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded transition-colors ${
                  showOverdue && i === currentIdx ? 'bg-destructive/30' :
                  isComplete ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
