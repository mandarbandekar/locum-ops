import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export const ADVISOR_DISCLAIMER =
  'For education and planning support only. LocumOps does not provide tax, legal, or financial advice. Tax treatment depends on your full situation, documentation, and applicable law. Always confirm strategies, deductions, and compliance requirements with a qualified CPA, EA, or tax attorney.';

export function AdvisorDisclaimerBanner() {
  return (
    <Alert className="border-[hsl(var(--warning))] bg-[hsl(var(--chip-warning-bg))]">
      <AlertTriangle className="h-4 w-4 text-[hsl(var(--chip-warning-text))]" />
      <AlertDescription className="text-[hsl(var(--chip-warning-text))] text-sm">
        {ADVISOR_DISCLAIMER}
      </AlertDescription>
    </Alert>
  );
}
