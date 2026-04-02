import { Zap, FileEdit, Send, Clock, DollarSign, CheckCircle } from 'lucide-react';

const steps = [
  { icon: <Zap className="h-3 w-3" />, label: 'Auto-Generated' },
  { icon: <FileEdit className="h-3 w-3" />, label: 'Review Draft' },
  { icon: <Send className="h-3 w-3" />, label: 'Send to Facility' },
  { icon: <Clock className="h-3 w-3" />, label: 'Awaiting Payment' },
  { icon: <DollarSign className="h-3 w-3" />, label: 'Record Payment' },
  { icon: <CheckCircle className="h-3 w-3" />, label: 'Paid' },
];

export function InvoiceWorkflowHint() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1">
            {step.icon}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-muted-foreground/40 text-xs">→</span>
          )}
        </div>
      ))}
    </div>
  );
}
