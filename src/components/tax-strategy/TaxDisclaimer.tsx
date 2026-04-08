import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function getDisclaimer(): string {
  return 'LocumOps gives you a clear picture of your estimated taxes based on your income, expenses, and tax profile — so you can plan ahead with confidence. These estimates are designed for planning and budgeting, not for filing. Every tax situation has nuances, so we always recommend reviewing your numbers with a CPA or tax professional before making final decisions.';
}

export const PERSISTENT_DISCLAIMER = getDisclaimer();

export const ENTITY_DISCLAIMER =
  "These scenarios help you explore how different business structures could affect your taxes. They're a starting point for conversations with your CPA — not a recommendation to change your entity type.";

export function TaxDisclaimerBanner() {
  return (
    <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertDescription className="text-muted-foreground text-sm">
        {getDisclaimer()}
      </AlertDescription>
    </Alert>
  );
}
