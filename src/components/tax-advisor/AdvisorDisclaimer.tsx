import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export const ADVISOR_DISCLAIMER =
  'For education and planning support only. LocumOps does not provide tax, legal, or financial advice. Tax treatment depends on your full situation, documentation, and applicable law. Always confirm strategies, deductions, and compliance requirements with a qualified CPA, EA, or tax attorney.';

export function AdvisorDisclaimerBanner() {
  return (
    <Alert className="border-warning bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning-foreground text-sm">
        {ADVISOR_DISCLAIMER}
      </AlertDescription>
    </Alert>
  );
}
