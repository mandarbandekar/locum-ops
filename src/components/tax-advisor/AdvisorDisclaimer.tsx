import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const ADVISOR_DISCLAIMER =
  "Think of this as your smart starting point. LocumOps helps you organize your tax picture and spot opportunities — but your CPA or tax advisor knows the full story. Use what you find here to have a better, faster conversation with them.";

export function AdvisorDisclaimerBanner() {
  return (
    <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50">
      <Info className="h-4 w-4 text-blue-500" />
      <AlertDescription className="text-muted-foreground text-sm">
        {ADVISOR_DISCLAIMER}
      </AlertDescription>
    </Alert>
  );
}
