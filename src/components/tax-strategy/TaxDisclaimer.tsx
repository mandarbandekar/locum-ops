import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { TAX_YEAR_CONFIG } from '@/lib/taxConstants2026';

export function getDisclaimer(stateCode?: string): string {
  const year = TAX_YEAR_CONFIG.activeYear;
  const stateLabel = stateCode ? ` and ${stateCode} ${year} progressive rates` : '';
  return `Estimates use ${year} federal brackets${stateLabel}, and inputs from your tax profile. This does not account for the QBI deduction (20% pass-through), AMT, itemized deductions, tax credits, or state-specific nuances beyond income tax. PTE calculations are directional — consult your S-Corp's CPA or tax advisor before electing or modifying PTE status. Use this to plan and save — not to file.`;
}

export const PERSISTENT_DISCLAIMER = getDisclaimer();

export const ENTITY_DISCLAIMER =
  'Entity examples and scenario estimates are for educational planning only. They do not recommend a business structure or guarantee savings.';

export function TaxDisclaimerBanner({ stateCode }: { stateCode?: string }) {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
        {getDisclaimer(stateCode)}
      </AlertDescription>
    </Alert>
  );
}
