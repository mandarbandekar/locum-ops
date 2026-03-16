import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export const ADVISOR_DISCLAIMER =
  'For education and planning support only. LocumOps does not provide tax, legal, or financial advice. Tax treatment depends on your full situation, documentation, and applicable law. Always confirm strategies, deductions, and compliance requirements with a qualified CPA, EA, or tax attorney.';

export function AdvisorDisclaimerBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
        {ADVISOR_DISCLAIMER}
      </AlertDescription>
    </Alert>
  );
}
