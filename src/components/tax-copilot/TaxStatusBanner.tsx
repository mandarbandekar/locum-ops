import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  statusLevel: 'on_track' | 'review' | 'action';
  reserveGap: number;
  pastDueQuarter?: number | null;
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function TaxStatusBanner({ statusLevel, reserveGap, pastDueQuarter }: Props) {
  if (statusLevel === 'on_track') {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">On Track</p>
          <p className="text-xs text-green-700 dark:text-green-400">Your reserve covers your estimated tax liability.</p>
        </div>
      </div>
    );
  }

  if (statusLevel === 'action') {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">Action Needed</p>
          <p className="text-xs text-destructive/80">
            {pastDueQuarter ? `Q${pastDueQuarter} payment is past due.` : 'A quarterly payment is past due.'} Review your quarterly status and confirm with your CPA.
          </p>
        </div>
      </div>
    );
  }

  // review
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Review Needed</p>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Your reserve is under your estimate by ${fmt(reserveGap)}. Consider increasing your set-aside.
        </p>
      </div>
    </div>
  );
}
