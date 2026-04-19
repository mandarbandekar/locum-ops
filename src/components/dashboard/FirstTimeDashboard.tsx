import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ShieldCheck, Calculator, Calendar, Building2, CalendarPlus, FileText,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { Shift, Invoice, Facility } from '@/types';
import { MoneyPipeline, PipelineStage } from './MoneyPipeline';

const TEAL = '#1A5C6B';
const SANDY = '#C9941E';

const fmtCurrency = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtDate = (d: Date) => format(d, 'MMM d');

interface FirstTimeDashboardProps {
  firstName: string;
  shifts: Shift[];
  facilities: Facility[];
  invoices: Invoice[];
  pipelineStages: PipelineStage[];
  quarter: number;
  quarterEarnings: number;
  shiftsThisQuarter: number;
  avgPerShift: number;
  hasTaxProfile: boolean;
  hasCredentials: boolean;
  hasCalendarSync: boolean;
  estimatedQuarterlyTax: number;
  perShiftSetAside: number;
  projectedQuarterEarnings: number;
  onSkip: () => void;
  onStageClick: (key: string) => void;
}

export function FirstTimeDashboard(props: FirstTimeDashboardProps) {
  const navigate = useNavigate();
  const {
    firstName, shifts, facilities, invoices, pipelineStages, quarter,
    quarterEarnings, shiftsThisQuarter, avgPerShift, hasTaxProfile,
    hasCredentials, hasCalendarSync, estimatedQuarterlyTax, perShiftSetAside,
    projectedQuarterEarnings, onSkip, onStageClick,
  } = props;

  // ── Upcoming shifts (booked, future) sorted by date asc ──
  const upcoming = useMemo(() => {
    const now = new Date();
    return shifts
      .filter(s => parseISO(s.start_datetime) >= now)
      .sort((a, b) => parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime());
  }, [shifts]);

  const totalProjectedEarnings = useMemo(
    () => upcoming.reduce((sum, s) => sum + (s.rate_applied || 0), 0),
    [upcoming]
  );

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name || 'Unknown';

  // Right column choice — Invoice > Tax > Fallback
  const draftInvoice = useMemo(
    () => invoices.find(i => i.status === 'draft') || null,
    [invoices]
  );
  const rightVariant: 'invoice' | 'tax' | 'fallback' =
    draftInvoice ? 'invoice' : hasTaxProfile ? 'tax' : 'fallback';

  // ── Recommended next steps (priority list) ──
  const recommendations = useMemo(() => {
    const items: {
      key: string; icon: LucideIcon; title: string; description: string;
      actionLabel: string; to: string;
    }[] = [];
    if (!hasCredentials) items.push({
      key: 'credentials', icon: ShieldCheck,
      title: 'Add Your Credentials',
      description: 'Track your licenses, DEA, COI, and CE certificates. Get reminders before they expire.',
      actionLabel: 'Add Credentials', to: '/credentials',
    });
    if (!hasTaxProfile) items.push({
      key: 'tax', icon: Calculator,
      title: 'Set Up Tax Estimates',
      description: 'See your estimated quarterly tax bill based on your actual earnings. Know what to set aside per shift.',
      actionLabel: 'Set Up Tax Profile', to: '/tax-center',
    });
    if (!hasCalendarSync) items.push({
      key: 'calendar', icon: Calendar,
      title: 'Sync Your Calendar',
      description: 'Subscribe your iPhone or Google Calendar so shifts show up alongside your personal schedule.',
      actionLabel: 'Sync Calendar', to: '/settings/calendar-sync',
    });
    if (facilities.length < 3) items.push({
      key: 'clinics', icon: Building2,
      title: 'Add More Clinics',
      description: 'The more clinics you add, the richer your earnings insights and rate comparisons become.',
      actionLabel: 'Add a Clinic', to: '/facilities',
    });
    if (shifts.length < 3) items.push({
      key: 'shifts', icon: CalendarPlus,
      title: 'Log More Shifts',
      description: 'Add your upcoming shifts to start building your earnings pipeline and auto-generate invoices.',
      actionLabel: 'Add Shifts', to: '/schedule',
    });
    items.push({
      key: 'insights', icon: FileText,
      title: 'Explore Business Insights',
      description: 'See revenue by clinic, payment speed, and performance trends as your data grows.',
      actionLabel: 'View Insights', to: '/business',
    });
    return items.slice(0, 3);
  }, [hasCredentials, hasTaxProfile, hasCalendarSync, facilities.length, shifts.length]);

  // Annotate: highlight COMPLETED with pulse + caption since data is "booked"
  const annotatedStages: PipelineStage[] = useMemo(() => {
    return pipelineStages.map(s => {
      let description = '';
      switch (s.key) {
        case 'completed': description = 'Shifts done, not yet invoiced'; break;
        case 'invoiced': description = 'Sent to clinic, waiting on due date'; break;
        case 'due_soon': description = 'Payment window closing this week'; break;
        case 'overdue': description = 'Past due — follow up needed'; break;
        case 'collected': description = 'Money received this month'; break;
      }
      return { ...s, description };
    });
  }, [pipelineStages]);

  const highlightStageKey = upcoming.length > 0 ? 'completed' : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Skip link */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip to full dashboard →
        </button>
      </div>

      {/* SECTION 1: Welcome + Instant Value */}
      <section className="bg-card rounded-xl shadow-sm p-6 md:p-8">
        <p
          className="font-semibold"
          style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: TEAL }}
        >
          Your Relief Business
        </p>
        <h2 className="mt-1 font-semibold text-foreground" style={{ fontSize: '24px', lineHeight: 1.25 }}>
          Nice work, {firstName}. Here's where you stand.
        </h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* LEFT: Upcoming Earnings */}
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              Upcoming Earnings
            </p>
            <p className="font-bold mt-2" style={{ fontSize: '36px', color: TEAL, lineHeight: 1 }}>
              {fmtCurrency(totalProjectedEarnings)}
            </p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              from {upcoming.length} booked shift{upcoming.length === 1 ? '' : 's'}
            </p>

            {upcoming.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {upcoming.slice(0, 5).map(s => (
                  <li key={s.id} className="text-[13px] text-foreground flex flex-wrap gap-x-1.5">
                    <span className="font-medium">{facilityName(s.facility_id)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{fmtDate(parseISO(s.start_datetime))}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-semibold">{fmtCurrency(s.rate_applied || 0)}</span>
                  </li>
                ))}
                {upcoming.length > 5 && (
                  <li>
                    <Link to="/schedule" className="text-[13px] font-medium" style={{ color: TEAL }}>
                      +{upcoming.length - 5} more →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* RIGHT: Variant */}
          <div>
            {rightVariant === 'invoice' && draftInvoice && (
              <>
                <p
                  className="font-semibold"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: SANDY }}
                >
                  Invoice Ready to Review
                </p>
                <div className="mt-3 rounded-lg border border-border-subtle p-4 bg-background/40">
                  <p className="text-[13px] font-mono text-muted-foreground">
                    {draftInvoice.invoice_number}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {facilityName(draftInvoice.facility_id)}
                  </p>
                  <p className="mt-1 text-[20px] font-semibold text-foreground">
                    {fmtCurrency(draftInvoice.total_amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${draftInvoice.id}`)}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL, padding: '12px 20px', fontSize: '14px' }}
                >
                  Review &amp; Send Invoice <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Invoices auto-generate from your shifts. Review and send with one tap.
                </p>
              </>
            )}

            {rightVariant === 'tax' && (
              <>
                <p
                  className="font-semibold"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: SANDY }}
                >
                  Estimated Quarterly Tax
                </p>
                <p className="mt-2 font-semibold text-foreground" style={{ fontSize: '20px' }}>
                  {fmtCurrency(estimatedQuarterlyTax)}
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Based on your projected earnings of {fmtCurrency(projectedQuarterEarnings)} this quarter
                </p>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: TEAL }}>
                  Set aside ~{fmtCurrency(perShiftSetAside)} per shift to stay on track
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/tax-center')}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors hover:bg-[#1A5C6B]/5"
                  style={{ border: `1px solid ${TEAL}`, color: TEAL, padding: '10px 18px', fontSize: '14px' }}
                >
                  View Full Tax Breakdown <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            {rightVariant === 'fallback' && (
              <>
                <p
                  className="font-semibold"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: TEAL }}
                >
                  Your First Invoice
                </p>
                <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
                  After your next shift, we'll auto-generate an invoice for you to review and send. No manual data entry needed.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors hover:bg-[#1A5C6B]/5"
                  style={{ border: `1px solid ${TEAL}`, color: TEAL, padding: '10px 18px', fontSize: '14px' }}
                >
                  Learn About Invoicing <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: Your Money Pipeline (annotated) */}
      <section>
        <h3 className="font-semibold text-foreground" style={{ fontSize: '18px' }}>
          Your Money Pipeline
        </h3>
        <div className="mt-3">
          <MoneyPipeline
            stages={annotatedStages}
            quarter={quarter}
            quarterEarnings={quarterEarnings}
            shiftsThisQuarter={shiftsThisQuarter}
            avgPerShift={avgPerShift}
            onStageClick={onStageClick}
            highlightStageKey={highlightStageKey ?? undefined}
            zeroSuffix="so far"
            stageFootnoteKey={highlightStageKey ?? undefined}
            stageFootnoteText="Your booked shifts will move here once completed"
          />
        </div>
      </section>

      {/* SECTION 3: Recommended Next Steps */}
      <section>
        <h3 className="font-semibold text-foreground" style={{ fontSize: '18px' }}>
          Get More From Locum Ops
        </h3>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Each step gets you closer to a complete picture of your business.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map(r => {
            const Icon = r.icon;
            return (
              <div
                key={r.key}
                className="bg-card rounded-lg border border-border-subtle p-5 flex flex-col"
              >
                <Icon className="h-6 w-6" style={{ color: TEAL }} />
                <p className="mt-3 font-semibold text-foreground" style={{ fontSize: '15px' }}>
                  {r.title}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2 flex-1">
                  {r.description}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(r.to)}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold self-start"
                  style={{ color: TEAL }}
                >
                  {r.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
