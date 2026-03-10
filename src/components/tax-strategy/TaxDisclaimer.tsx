import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TaxDisclaimer() {
  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>Not tax, legal, or financial advice.</strong> LocumOps provides educational tools, reminders, and
        organization features only. Tax outcomes depend on your full situation, entity structure, state rules, payroll,
        deductions, and documentation. Always review tax strategy, entity decisions, compensation, and deductions with a
        qualified CPA or tax professional.
      </AlertDescription>
    </Alert>
  );
}
