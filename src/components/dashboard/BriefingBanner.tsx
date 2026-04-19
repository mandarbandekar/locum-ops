import { Sparkles } from 'lucide-react';

interface BriefingBannerProps {
  firstName: string;
  shiftCount: number;
  shiftTotal: number;
  lastMonthShiftCount: number;
  lastMonthTotal: number;
  overdueCount: number;
  overdueTotal: number;
  dueSoonCount: number;
  dueSoonTotal: number;
  nextCredentialName: string | null;
  nextCredentialDays: number | null;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function BriefingBanner(props: BriefingBannerProps) {
  const {
    shiftCount, shiftTotal, lastMonthShiftCount, lastMonthTotal,
    overdueCount, overdueTotal, dueSoonCount, dueSoonTotal,
    nextCredentialName, nextCredentialDays,
  } = props;

  // Line 1
  const line1 = shiftCount > 0
    ? `You have ${shiftCount} shift${shiftCount > 1 ? 's' : ''} worth ${fmt(shiftTotal)} coming up this week.`
    : `No shifts booked this week. Last month you completed ${lastMonthShiftCount} shift${lastMonthShiftCount === 1 ? '' : 's'} and earned ${fmt(lastMonthTotal)}.`;

  // Line 2
  let line2: string | null = null;
  if (overdueCount > 0) {
    line2 = `Heads up — ${overdueCount} invoice${overdueCount > 1 ? 's' : ''} totaling ${fmt(overdueTotal)} ${overdueCount > 1 ? 'are' : 'is'} overdue.`;
  } else if (dueSoonCount > 0) {
    line2 = `${dueSoonCount} invoice${dueSoonCount > 1 ? 's' : ''} worth ${fmt(dueSoonTotal)} ${dueSoonCount > 1 ? 'are' : 'is'} due in the next 7 days.`;
  }

  // Line 3
  const line3 = nextCredentialName && nextCredentialDays !== null && nextCredentialDays <= 30
    ? `Your ${nextCredentialName} is due for renewal in ${nextCredentialDays} day${nextCredentialDays === 1 ? '' : 's'}.`
    : null;

  // Fallback
  const allClear = !line2 && !line3;
  const fallback = "All invoices are current and no credentials are expiring soon — you're in good shape.";

  return (
    <div className="relative bg-card rounded-lg border border-border-subtle shadow-sm overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A5C6B]" />
      <div className="flex items-start gap-3 px-5 py-4 pl-6">
        <Sparkles className="h-5 w-5 text-[#1A5C6B] shrink-0 mt-0.5" />
        <p
          className="text-foreground"
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#374151',
          }}
        >
          {line1}{' '}
          {line2 && <>{line2}{' '}</>}
          {line3 && <>{line3}</>}
          {allClear && <>{fallback}</>}
        </p>
      </div>
    </div>
  );
}
