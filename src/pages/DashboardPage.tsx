import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, FileText, DollarSign, AlertTriangle, ArrowRight,
  Clock, CheckCircle, Building2, Plus, Send, ShieldAlert, CheckSquare,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { format, differenceInDays, addMonths, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';
import { useConfirmations } from '@/hooks/useConfirmations';
import { useCredentials } from '@/hooks/useCredentials';
import { generateCredentialReminders } from '@/lib/reminderEngine';

const dashDb = (table: string) => supabase.from(table as any);

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems } = useData();
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  // Tax readiness data for dashboard hooks
  const [taxChecklist, setTaxChecklist] = useState<{ completed: boolean }[]>([]);
  const [taxQuarters, setTaxQuarters] = useState<{ quarter: number; due_date: string; status: string }[]>([]);

  useEffect(() => {
    if (isDemo) return;
    if (!user) return;
    Promise.all([
      dashDb('tax_checklist_items').select('completed'),
      dashDb('tax_quarter_statuses').select('quarter,due_date,status').eq('tax_year', now.getFullYear()).order('quarter'),
    ]).then(([clRes, qsRes]) => {
      if (clRes.data) setTaxChecklist(clRes.data as any[]);
      if (qsRes.data) setTaxQuarters(qsRes.data as any[]);
    });
  }, [user?.id, isDemo]);

  // ── Summary card data ──
  const summaryData = useMemo(() => {
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingShifts = shifts
      .filter(s => new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in7Days && (s.status === 'booked' || s.status === 'proposed'))
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

    const draftInvoices = invoices.filter(i => i.status === 'draft');
    const draftTotal = draftInvoices.reduce((s, i) => s + i.total_amount, 0);

    const unpaidInvoices = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      return status === 'sent' || status === 'partial' || status === 'overdue';
    });
    const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.balance_due, 0);
    const overdueCount = unpaidInvoices.filter(i => computeInvoiceStatus(i) === 'overdue').length;
    const sentCount = unpaidInvoices.filter(i => i.status === 'sent').length;
    const partialCount = unpaidInvoices.filter(i => i.status === 'partial').length;

    // Due soon items
    const dueSoonChecklist = checklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });

    const dueSoonTotal = dueSoonChecklist.length;
    const dueSoonExamples: string[] = [];
    if (dueSoonChecklist.length > 0) {
      const sorted = [...dueSoonChecklist].sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
      const first = sorted[0];
      const days = differenceInDays(new Date(first.due_date!), now);
      dueSoonExamples.push(days < 0 ? `${first.title} overdue` : `${first.title} in ${days} days`);
      if (sorted.length > 1) dueSoonExamples.push(`${sorted.length - 1} more item${sorted.length - 1 > 1 ? 's' : ''}`);
    }

    const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

    const nextShift = upcomingShifts[0];
    const nextShiftLabel = nextShift
      ? `${format(new Date(nextShift.start_datetime), 'EEE, MMM d · h:mm a')} · ${getFacilityName(nextShift.facility_id)}`
      : null;

    return {
      upcomingShifts, draftInvoices, draftTotal, unpaidInvoices, outstandingTotal,
      overdueCount, sentCount, partialCount, dueSoonTotal, dueSoonExamples,
      nextShiftLabel, getFacilityName,
    };
  }, [shifts, invoices, facilities, checklistItems, now]);

  // ── Today's Priorities (today, tomorrow, overdue only) ──
  const todayStart = startOfDay(now);

  const priorities = useMemo(() => {
    type PriorityItem = { title: string; context: string; link: string; icon: React.ElementType; urgency: number; bucket: 'overdue' | 'today' | 'tomorrow' };
    const items: PriorityItem[] = [];
    const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

    // 1) Overdue invoices
    invoices.filter(i => computeInvoiceStatus(i) === 'overdue').forEach(inv => {
      items.push({
        title: `Follow up on ${inv.invoice_number}`,
        context: `$${inv.balance_due.toLocaleString()} overdue · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`,
        icon: AlertTriangle,
        urgency: 1,
        bucket: 'overdue',
      });
    });

    // 2) Draft invoices ready to send (treat as today)
    invoices.filter(i => i.status === 'draft').forEach(inv => {
      items.push({
        title: `Review and send ${inv.invoice_number}`,
        context: `$${inv.total_amount.toLocaleString()} ready to send · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`,
        icon: Send,
        urgency: 2,
        bucket: 'today',
      });
    });

    // 3) Shifts today or tomorrow
    shifts
      .filter(s => {
        const d = new Date(s.start_datetime);
        return (isToday(d) || isTomorrow(d)) && (s.status === 'booked' || s.status === 'proposed');
      })
      .forEach(s => {
        const d = new Date(s.start_datetime);
        items.push({
          title: `Shift at ${getFacilityName(s.facility_id)}`,
          context: format(d, 'EEE, MMM d · h:mm a'),
          link: '/schedule',
          icon: CalendarDays,
          urgency: isToday(d) ? 3 : 5,
          bucket: isToday(d) ? 'today' : 'tomorrow',
        });
      });

    // 4) Overdue contract checklist items
    checklistItems
      .filter(item => {
        const badge = getChecklistBadge(item);
        if (badge === 'overdue') return true;
        if (badge === 'due_soon' && item.due_date) {
          const d = new Date(item.due_date);
          return isToday(d) || isTomorrow(d);
        }
        return false;
      })
      .forEach(item => {
        const badge = getChecklistBadge(item);
        const d = item.due_date ? new Date(item.due_date) : now;
        const isOverdue = badge === 'overdue';
        items.push({
          title: item.title,
          context: isOverdue ? 'Overdue' : isToday(d) ? 'Due today' : 'Due tomorrow',
          link: '/facilities',
          icon: ShieldAlert,
          urgency: isOverdue ? 1 : 4,
          bucket: isOverdue ? 'overdue' : isToday(d) ? 'today' : 'tomorrow',
        });
      });

    return items.sort((a, b) => a.urgency - b.urgency);
  }, [invoices, shifts, facilities, checklistItems, now]);

  // Confirmations needing action
  const { needingActionCount } = useConfirmations();
  const { credentials: credentialsList } = useCredentials();

  const confirmationPriorities = useMemo(() => {
    if (needingActionCount <= 0) return [];
    return [{
      title: `${needingActionCount} confirmation${needingActionCount > 1 ? 's' : ''} need action`,
      context: 'Review and send monthly shift confirmations',
      link: '/schedule',
      icon: CheckSquare,
      urgency: 4,
      bucket: 'today' as const,
    }];
  }, [needingActionCount]);

  // Credential renewal reminders (only today/tomorrow/overdue)
  const credentialPriorities = useMemo(() => {
    if (!credentialsList) return [];
    return generateCredentialReminders(credentialsList, now, 1).map(r => ({
      title: r.title,
      context: r.body,
      link: r.link,
      icon: ShieldAlert,
      urgency: r.urgency,
      bucket: 'today' as const,
    }));
  }, [credentialsList, now]);

  const allPriorities = useMemo(() => {
    return [...priorities, ...confirmationPriorities, ...credentialPriorities]
      .sort((a, b) => a.urgency - b.urgency);
  }, [priorities, confirmationPriorities, credentialPriorities]);

  const overduePriorities = allPriorities.filter(p => p.bucket === 'overdue');
  const todayPriorities = allPriorities.filter(p => p.bucket === 'today');
  const tomorrowPriorities = allPriorities.filter(p => p.bucket === 'tomorrow');

  // ── This Period ──
  const periodData = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const paidThisMonth = payments
      .filter(p => {
        const d = new Date(p.payment_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, p) => s + p.amount, 0);

    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 3);

    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const upcomingShifts = shifts
      .filter(s => new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in7Days && (s.status === 'booked' || s.status === 'proposed'))
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .slice(0, 3);

    return { paidThisMonth, recentPayments, upcomingShifts };
  }, [payments, shifts, now]);

  // ── Tracking Overview ──
  const trackingLines = useMemo(() => {
    const lines: { text: string; link: string }[] = [];

    if (needingActionCount > 0) {
      lines.push({ text: `Confirmations: ${needingActionCount} need${needingActionCount > 1 ? '' : 's'} action`, link: '/schedule' });
    }

    const dueSoonChecklist = checklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });
    if (dueSoonChecklist.length > 0) {
      lines.push({ text: `Contracts: ${dueSoonChecklist.length} item${dueSoonChecklist.length > 1 ? 's' : ''} due soon`, link: '/facilities' });
    }

    // Tax readiness hooks
    if (taxChecklist.length > 0) {
      const completed = taxChecklist.filter(c => c.completed).length;
      const percent = Math.round((completed / taxChecklist.length) * 100);
      lines.push({ text: `Tax readiness: ${percent}%`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      lines.push({ text: `Taxes: Q${nextQuarter.quarter} due in ${daysUntil} days`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    return lines;
  }, [checklistItems, taxChecklist, taxQuarters, needingActionCount, now]);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';
  const getInvoiceForPayment = (invoiceId: string) => invoices.find(i => i.id === invoiceId);

  const hasNoData = shifts.length === 0 && invoices.length === 0 && facilities.length === 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col gap-3 overflow-hidden">
      <div className="page-header shrink-0 !mb-0 !pb-0">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* ── TOP ROW: 4 Summary Cards ── */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 shrink-0">
        <SummaryCard
          icon={CalendarDays}
          title="Upcoming Shifts"
          value={summaryData.upcomingShifts.length}
          subtitle={summaryData.nextShiftLabel || 'No upcoming shifts this week'}
          cta="View Schedule"
          onClick={() => navigate('/schedule')}
          accentClass="text-primary"
          bgClass="bg-primary/10"
        />
        <SummaryCard
          icon={FileText}
          title="Ready to Invoice"
          value={`$${summaryData.draftTotal.toLocaleString()}`}
          subtitle={summaryData.draftInvoices.length > 0
            ? `${summaryData.draftInvoices.length} draft${summaryData.draftInvoices.length > 1 ? 's' : ''} ready to bill`
            : 'No invoices ready to send'}
          cta="Review Invoices"
          onClick={() => navigate('/invoices')}
          accentClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-500/10"
        />
        <SummaryCard
          icon={DollarSign}
          title="Outstanding"
          value={`$${summaryData.outstandingTotal.toLocaleString()}`}
          subtitle={summaryData.unpaidInvoices.length > 0
            ? `${summaryData.unpaidInvoices.length} unpaid${summaryData.overdueCount > 0 ? ` · ${summaryData.overdueCount} overdue` : ''}`
            : 'No unpaid invoices'}
          cta="View Payments"
          onClick={() => navigate('/invoices')}
          accentClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-500/10"
        />
        <SummaryCard
          icon={ShieldAlert}
          title="Due Soon"
          value={summaryData.dueSoonTotal}
          subtitle={summaryData.dueSoonExamples.length > 0
            ? summaryData.dueSoonExamples.join(' · ')
            : 'No urgent admin items'}
          cta="View Details"
          onClick={() => navigate('/facilities')}
          accentClass="text-destructive"
          bgClass="bg-destructive/10"
        />
      </div>

      {/* ── BOTTOM: Priorities + This Period + Tracking ── */}
      <div className="grid gap-3 lg:grid-cols-3 flex-1 min-h-0">
        {/* Priorities (spans 2 cols) */}
        <Card className="lg:col-span-2 flex flex-col min-h-0">
          <CardHeader className="pb-2 shrink-0 py-3">
            <CardTitle className="text-base font-semibold">Priorities</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0 pb-3">
            {allPriorities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <CheckCircle className="h-7 w-7 text-primary mb-2" />
                <p className="font-medium text-foreground text-sm">You're all caught up.</p>
                <p className="text-xs text-muted-foreground">No urgent actions right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {overduePriorities.length > 0 && (
                  <PriorityBucket label="Overdue" items={overduePriorities} variant="destructive" navigate={navigate} />
                )}
                {todayPriorities.length > 0 && (
                  <PriorityBucket label="Today" items={todayPriorities} variant="default" navigate={navigate} />
                )}
                {tomorrowPriorities.length > 0 && (
                  <PriorityBucket label="Tomorrow" items={tomorrowPriorities} variant="muted" navigate={navigate} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: This Period + Tracking */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Paid This Month */}
          <Card className="shrink-0">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold">${periodData.paidThisMonth.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Paid this month</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments + Upcoming Shifts */}
          <div className="grid gap-3 grid-cols-2 flex-1 min-h-0">
            <Card className="flex flex-col min-h-0">
              <CardHeader className="pb-1 py-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 py-1">
                {periodData.recentPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">No recent payments</p>
                ) : (
                  <div className="space-y-1.5">
                    {periodData.recentPayments.map(p => {
                      const inv = getInvoiceForPayment(p.invoice_id);
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <p className="font-medium truncate">{inv ? getFacilityName(inv.facility_id) : 'Unknown'}</p>
                          <div className="text-right shrink-0 ml-1">
                            <p className="font-medium">${p.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col min-h-0">
              <CardHeader className="pb-1 py-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 py-1">
                {periodData.upcomingShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">No shifts scheduled</p>
                ) : (
                  <div className="space-y-1.5">
                    {periodData.upcomingShifts.map(s => (
                      <div key={s.id} className="text-xs">
                        <p className="font-medium truncate">{getFacilityName(s.facility_id)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(s.start_datetime), 'EEE, MMM d · h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tracking Overview */}
          <Card className="shrink-0">
            <CardHeader className="pb-1 py-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tracking Overview</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              {trackingLines.length === 0 && !hasNoData ? (
                <p className="text-xs text-muted-foreground">Everything looks good.</p>
              ) : hasNoData ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Get started:</p>
                  <Button variant="outline" size="sm" className="w-full justify-start h-7 text-xs" onClick={() => navigate('/facilities')}>
                    <Building2 className="mr-1.5 h-3 w-3" /> Add facility
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start h-7 text-xs" onClick={() => navigate('/schedule')}>
                    <CalendarDays className="mr-1.5 h-3 w-3" /> Add shift
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {trackingLines.map((line, i) => (
                    <div
                      key={i}
                      className="text-xs py-1 cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                      onClick={() => navigate(line.link)}
                    >
                      <span className="text-muted-foreground truncate">{line.text}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon, title, value, subtitle, cta, onClick, accentClass, bgClass,
}: {
  icon: React.ElementType; title: string; value: string | number; subtitle: string;
  cta: string; onClick: () => void; accentClass: string; bgClass: string;
}) {
  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`h-4 w-4 ${accentClass}`} />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
        <p className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {cta} <ArrowRight className="h-3 w-3" />
        </p>
      </CardContent>
    </Card>
  );
}

function PriorityBucket({
  label, items, variant, navigate,
}: {
  label: string;
  items: Array<{ title: string; context: string; link: string; icon: React.ElementType }>;
  variant: 'destructive' | 'default' | 'muted';
  navigate: (path: string) => void;
}) {
  const labelClass = variant === 'destructive'
    ? 'text-destructive'
    : variant === 'default'
      ? 'text-foreground'
      : 'text-muted-foreground';

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${labelClass}`}>{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
            onClick={() => navigate(item.link)}
          >
            <div className={`p-2 rounded-md shrink-0 ${variant === 'destructive' ? 'bg-destructive/10' : 'bg-muted'}`}>
              <item.icon className={`h-4 w-4 ${variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.context}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
