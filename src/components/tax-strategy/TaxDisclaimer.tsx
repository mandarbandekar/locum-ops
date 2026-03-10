import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export const PERSISTENT_DISCLAIMER =
  'Not tax, legal, or financial advice. LocumOps provides educational tools, reminders, and organization features only. Tax outcomes depend on your full situation, entity structure, state rules, payroll, deductions, and documentation. Always review tax strategy, entity decisions, compensation, and deductions with a qualified CPA or tax professional.';

export const ENTITY_DISCLAIMER =
  'Entity examples and scenario estimates are for educational planning only. They do not recommend a business structure or guarantee savings.';

export function TaxDisclaimerBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
        {PERSISTENT_DISCLAIMER}
      </AlertDescription>
    </Alert>
  );
}
