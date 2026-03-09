import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, FileText, DollarSign, AlertTriangle, ArrowRight,
  Clock, CheckCircle, Building2, Plus, Send, ShieldAlert,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { format, differenceInDays } from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments } = useData();
  const navigate = useNavigate();
  const now = new Date();

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
    const dueSoonChecklist = seedChecklistItems.filter(item => {
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
  }, [shifts, invoices, facilities, now]);

  // ── Today's Priorities ──
  const priorities = useMemo(() => {
    const items: { title: string; context: string; link: string; icon: React.ElementType; urgency: number }[] = [];
    const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

    // 1) Overdue invoices
    invoices.filter(i => computeInvoiceStatus(i) === 'overdue').forEach(inv => {
      items.push({
        title: `Follow up on ${inv.invoice_number}`,
        context: `$${inv.balance_due.toLocaleString()} overdue · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`,
        icon: AlertTriangle,
        urgency: 1,
      });
    });

    // 2) Draft invoices ready to send
    invoices.filter(i => i.status === 'draft').forEach(inv => {
      items.push({
        title: `Review and send ${inv.invoice_number}`,
        context: `$${inv.total_amount.toLocaleString()} ready to send · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`,
        icon: Send,
        urgency: 2,
      });
    });

    // 5) Upcoming shifts in next 48 hours
    const in48h = new Date(now);
    in48h.setHours(in48h.getHours() + 48);
    shifts
      .filter(s => new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in48h && (s.status === 'booked' || s.status === 'proposed'))
      .forEach(s => {
        items.push({
          title: `Shift at ${getFacilityName(s.facility_id)}`,
          context: format(new Date(s.start_datetime), 'EEE, MMM d · h:mm a'),
          link: '/schedule',
          icon: CalendarDays,
          urgency: 5,
        });
      });

    // 8) Contract checklist items due soon
    seedChecklistItems
      .filter(item => getChecklistBadge(item) === 'due_soon' || getChecklistBadge(item) === 'overdue')
      .forEach(item => {
        const badge = getChecklistBadge(item);
        const days = differenceInDays(new Date(item.due_date!), now);
        items.push({
          title: `${item.title}`,
          context: badge === 'overdue' ? 'Overdue' : `Due in ${days} days`,
          link: `/facilities`,
          icon: ShieldAlert,
          urgency: badge === 'overdue' ? 3 : 8,
        });
      });

    return items.sort((a, b) => a.urgency - b.urgency).slice(0, 6);
  }, [invoices, shifts, facilities, now]);

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

    const dueSoonChecklist = seedChecklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });
    if (dueSoonChecklist.length > 0) {
      lines.push({ text: `Contracts: ${dueSoonChecklist.length} item${dueSoonChecklist.length > 1 ? 's' : ''} due soon`, link: '/facilities' });
    }

    return lines;
  }, []);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';
  const getInvoiceForPayment = (invoiceId: string) => invoices.find(i => i.id === invoiceId);

  const hasNoData = shifts.length === 0 && invoices.length === 0 && facilities.length === 0;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* ── TOP ROW: 4 Summary Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Upcoming Shifts */}
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

        {/* Card 2: Ready to Invoice */}
        <SummaryCard
          icon={FileText}
          title="Ready to Invoice"
          value={`$${summaryData.draftTotal.toLocaleString()}`}
          subtitle={summaryData.draftInvoices.length > 0
            ? `${summaryData.draftInvoices.length} draft invoice${summaryData.draftInvoices.length > 1 ? 's' : ''} · Work completed and ready to bill`
            : 'No invoices ready to send'}
          cta="Review Invoices"
          onClick={() => navigate('/invoices')}
          accentClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-500/10"
        />

        {/* Card 3: Outstanding Balance */}
        <SummaryCard
          icon={DollarSign}
          title="Outstanding Balance"
          value={`$${summaryData.outstandingTotal.toLocaleString()}`}
          subtitle={summaryData.unpaidInvoices.length > 0
            ? `${summaryData.unpaidInvoices.length} unpaid${summaryData.overdueCount > 0 ? ` · ${summaryData.overdueCount} overdue` : ''}`
            : 'No unpaid invoices'}
          cta="View Payments"
          onClick={() => navigate('/invoices')}
          accentClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-500/10"
        />

        {/* Card 4: Due Soon */}
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

      {/* ── MIDDLE: Today's Priorities ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Today's Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">You're all caught up.</p>
              <p className="text-sm text-muted-foreground">No urgent actions right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {priorities.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(item.link)}
                >
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.context}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BOTTOM: This Period + Tracking Overview ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* This Period (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">This Period</h2>

          {/* Paid This Month */}
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">${periodData.paidThisMonth.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Paid this month</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Recent Payments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {periodData.recentPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No recent payments</p>
                ) : (
                  <div className="space-y-2">
                    {periodData.recentPayments.map(p => {
                      const inv = getInvoiceForPayment(p.invoice_id);
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{inv ? getFacilityName(inv.facility_id) : 'Unknown'}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="font-medium">${p.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(p.payment_date), 'MMM d')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Shifts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                {periodData.upcomingShifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No shifts scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {periodData.upcomingShifts.map(s => (
                      <div key={s.id} className="text-sm">
                        <p className="font-medium">{getFacilityName(s.facility_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.start_datetime), 'EEE, MMM d · h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tracking Overview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tracking Overview</h2>
          <Card>
            <CardContent className="p-4">
              {trackingLines.length === 0 && !hasNoData ? (
                <p className="text-sm text-muted-foreground py-2">Everything looks good — no items needing attention.</p>
              ) : hasNoData ? (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">Get started by setting up your practice.</p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/facilities')}>
                      <Building2 className="mr-2 h-4 w-4" /> Add first facility
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/schedule')}>
                      <CalendarDays className="mr-2 h-4 w-4" /> Add first shift
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/invoices')}>
                      <FileText className="mr-2 h-4 w-4" /> Create first invoice
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/credentials')}>
                      <ShieldAlert className="mr-2 h-4 w-4" /> Add first credential
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {trackingLines.map((line, i) => (
                    <div
                      key={i}
                      className="text-sm py-1.5 cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                      onClick={() => navigate(line.link)}
                    >
                      <span className="text-muted-foreground">{line.text}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
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
