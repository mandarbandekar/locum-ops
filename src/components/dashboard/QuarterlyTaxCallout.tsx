import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

interface QuarterlyTaxCalloutProps {
  quarter: number;
  deadline: Date;
  daysUntilDeadline: number; // negative = past due
  quarterEarnings: number;
  estimatedTax: number;
  hasTaxProfile: boolean;
}

const fmtCurrency = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function QuarterlyTaxCallout({
  quarter,
  deadline,
  daysUntilDeadline,
  quarterEarnings,
  estimatedTax,
  hasTaxProfile,
}: QuarterlyTaxCalloutProps) {
  const SANDY = '#C9941E';
  const BURNT = '#A07D3E';
  const isPastDue = daysUntilDeadline < 0;
  const daysPast = Math.abs(daysUntilDeadline);

  // Don't render if past due
  if (isPastDue) return null;
  // Don't render if more than 30 days away
  if (daysUntilDeadline > 30) return null;

  // Urgency styling
  let borderColor = SANDY;
  let bgTint: string | undefined;
  let showClock = false;
  let dueBold = false;

  if (isPastDue) {
    borderColor = BURNT;
    bgTint = 'rgba(160, 125, 62, 0.05)';
    dueBold = true;
    showClock = true;
  } else if (daysUntilDeadline <= 6) {
    borderColor = BURNT;
    bgTint = 'rgba(160, 125, 62, 0.03)';
    dueBold = true;
    showClock = true;
  } else if (daysUntilDeadline <= 14) {
    borderColor = BURNT;
    showClock = true;
  }

  const headlineText = `Q${quarter} payment ${isPastDue ? 'was due' : 'due'} ${format(deadline, 'MMM d')}`;

  let bodyText: string;
  if (!hasTaxProfile) {
    bodyText = 'Set up your tax profile to get quarterly estimates based on your actual earnings and deductions.';
  } else if (isPastDue) {
    bodyText = `Your Q${quarter} estimated payment was due ${format(deadline, 'MMM d')}. If you haven't submitted it yet, consider doing so to avoid potential penalties.`;
  } else {
    bodyText = `Based on ${fmtCurrency(quarterEarnings)} earned this quarter, your estimated payment is approximately ${fmtCurrency(estimatedTax)}. This covers federal self-employment tax and estimated income tax.`;
  }

  let dueText: string;
  if (isPastDue) dueText = `${daysPast} day${daysPast === 1 ? '' : 's'} past due`;
  else if (daysUntilDeadline === 0) dueText = 'due today';
  else dueText = `due in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'}`;

  const ctaLabel = hasTaxProfile ? 'View Tax Strategy →' : 'Set Up Tax Profile →';
  const ctaLink = hasTaxProfile ? '/tax-center' : '/tax-center';

  return (
    <div
      className="relative bg-card rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-200"
      style={{ backgroundColor: bgTint }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: '3px', backgroundColor: borderColor }}
      />
      <div className="flex flex-col md:flex-row gap-4 md:items-center" style={{ padding: '20px', paddingLeft: '23px' }}>
        {/* Left section */}
        <div className="md:w-3/5 order-2 md:order-1">
          <p
            className="font-semibold"
            style={{
              fontSize: '11px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: SANDY,
            }}
          >
            Quarterly Tax Estimate
          </p>
          <h3
            className="flex items-center gap-2 mt-1 font-semibold"
            style={{ fontSize: '18px', color: '#374151' }}
          >
            {showClock && <Clock className="h-4 w-4 shrink-0" style={{ color: borderColor }} />}
            {headlineText}
          </h3>
          <p className="mt-2" style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
            {bodyText}
          </p>
          {hasTaxProfile && !isPastDue && (
            <p className="mt-2 italic" style={{ fontSize: '12px', color: '#9CA3AF' }}>
              This is an estimate for planning purposes. Consult your CPA for exact figures.
            </p>
          )}
        </div>

        {/* Right section */}
        <div className="md:w-2/5 order-1 md:order-2 flex flex-col md:items-end items-start">
          {hasTaxProfile && (
            <p
              className="font-semibold leading-none"
              style={{ fontSize: '32px', color: SANDY }}
            >
              {fmtCurrency(estimatedTax)}
            </p>
          )}
          <p
            className="mt-2"
            style={{
              fontSize: '14px',
              color: dueBold ? '#374151' : '#6B7280',
              fontWeight: dueBold ? 700 : 400,
            }}
          >
            {dueText}
          </p>
          <Link
            to={ctaLink}
            className="mt-3 inline-flex items-center justify-center font-medium rounded-md transition-colors hover:bg-[#C9941E]/5 w-full md:w-auto"
            style={{
              border: `1px solid ${SANDY}`,
              color: SANDY,
              padding: '8px 16px',
              fontSize: '13px',
            }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
