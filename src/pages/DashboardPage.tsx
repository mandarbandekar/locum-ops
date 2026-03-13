import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, DollarSign, AlertTriangle, ArrowRight,
  Clock, CheckCircle, Building2, Send, ShieldAlert, CheckSquare,
  CalendarDays, TrendingUp,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { format, differenceInDays } from 'date-fns';
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

  const [taxChecklist, setTaxChecklist] = useState<{ completed: boolean }[]>([]);
  const [taxQuarters, setTaxQuarters] = useState<{ quarter: number; due_date: string; status: string }[]>([]);

  useEffect(() => {
    if (isDemo || !user) return;
    Promise.all([
      dashDb('tax_checklist_items').select('completed'),
      dashDb('tax_quarter_statuses').select('quarter,due_date,status').eq('tax_year', now.getFullYear()).order('quarter'),
    ]).then(([clRes, qsRes]) => {
      if (clRes.data) setTaxChecklist(clRes.data as any[]);
      if (qsRes.data) setTaxQuarters(qsRes.data as any[]);
    });
  }, [user?.id, isDemo]);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  // ── Priorities: only overdue + due today ──
  const { needingActionCount } = useConfirmations();
  const { credentials: credentialsList } = useCredentials();

  const allPriorities = useMemo(() => {
    const items: { title: string; context: string; link: string; icon: React.ElementType; urgency: number }[] = [];

    // Overdue invoices
    invoices.filter(i => computeInvoiceStatus(i) === 'overdue').forEach(inv => {
      items.push({
        title: `Follow up on ${inv.invoice_number}`,
        context: `$${inv.balance_due.toLocaleString()} overdue · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`, icon: AlertTriangle, urgency: 1,
      });
    });

    // Draft invoices
    invoices.filter(i => i.status === 'draft').forEach(inv => {
      items.push({
        title: `Send ${inv.invoice_number}`,
        context: `$${inv.total_amount.toLocaleString()} · ${getFacilityName(inv.facility_id)}`,
        link: `/invoices/${inv.id}`, icon: Send, urgency: 2,
      });
    });

    // Confirmations needing action
    if (needingActionCount > 0) {
      items.push({
        title: `${needingActionCount} confirmation${needingActionCount > 1 ? 's' : ''} need action`,
        context: 'Review and send shift confirmations',
        link: '/schedule', icon: CheckSquare, urgency: 3,
      });
    }

    // Overdue checklist items
    checklistItems
      .filter(item => {
        const badge = getChecklistBadge(item);
        return badge === 'overdue' || badge === 'due_soon';
      })
      .forEach(item => {
        const badge = getChecklistBadge(item);
        const days = item.due_date ? differenceInDays(new Date(item.due_date), now) : 0;
        if (badge === 'overdue' || days === 0) {
          items.push({
            title: item.title,
            context: badge === 'overdue' ? 'Overdue' : 'Due today',
            link: '/facilities', icon: ShieldAlert, urgency: badge === 'overdue' ? 1 : 4,
          });
        }
      });

    // Credential renewals due
    if (credentialsList) {
      generateCredentialReminders(credentialsList, now, 14).forEach(r => {
        items.push({ title: r.title, context: r.body, link: r.link, icon: ShieldAlert, urgency: r.urgency });
      });
    }

    return items.sort((a, b) => a.urgency - b.urgency).slice(0, 6);
  }, [invoices, shifts, facilities, checklistItems, needingActionCount, credentialsList, now]);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const draftInvoices = invoices.filter(i => i.status === 'draft');
    const draftTotal = draftInvoices.reduce((s, i) => s + i.total_amount, 0);

    const unpaidInvoices = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      return status === 'sent' || status === 'partial' || status === 'overdue';
    });
    const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.balance_due, 0);
    const overdueCount = unpaidInvoices.filter(i => computeInvoiceStatus(i) === 'overdue').length;

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
      .slice(0, 4);

    return { draftInvoices, draftTotal, outstandingTotal, overdueCount, paidThisMonth, recentPayments };
  }, [invoices, payments, now]);

  // ── Tracking lines ──
  const trackingLines = useMemo(() => {
    const lines: { label: string; value: string; link: string }[] = [];

    if (needingActionCount > 0) {
      lines.push({ label: 'Confirmations', value: `${needingActionCount} pending`, link: '/schedule' });
    }

    const dueChecklist = checklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });
    if (dueChecklist.length > 0) {
      lines.push({ label: 'Contracts', value: `${dueChecklist.length} due`, link: '/facilities' });
    }

    if (taxChecklist.length > 0) {
      const completed = taxChecklist.filter(c => c.completed).length;
      const percent = Math.round((completed / taxChecklist.length) * 100);
      lines.push({ label: 'Tax readiness', value: `${percent}%`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      lines.push({ label: `Q${nextQuarter.quarter} taxes`, value: `${daysUntil}d`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    return lines;
  }, [checklistItems, taxChecklist, taxQuarters, needingActionCount, now]);

  const getInvoiceForPayment = (invoiceId: string) => invoices.find(i => i.id === invoiceId);
  const hasNoData = shifts.length === 0 && invoices.length === 0 && facilities.length === 0;

  return (
    <div className="h-[calc(100vh-theme(spacing.14)-theme(spacing.6)-theme(spacing.6))] flex flex-col gap-4 overflow-hidden">
      {/* Row 1: Priority summary + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 shrink-0">
        {/* Priority summary pill bar */}
        <div className="lg:col-span-5 flex items-center gap-3">
          <h1 className="text-xl font-bold whitespace-nowrap">Dashboard</h1>
          <div className="flex items-center gap-2 ml-2">
            {allPriorities.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {allPriorities.length} action{allPriorities.length > 1 ? 's' : ''} needed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                <CheckCircle className="h-3 w-3" />
                All clear
              </span>
            )}
          </div>
        </div>

        {/* Top stat pills */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-3">
          <StatPill
            label="Ready to bill"
            value={`$${stats.draftTotal.toLocaleString()}`}
            sub={`${stats.draftInvoices.length} draft${stats.draftInvoices.length !== 1 ? 's' : ''}`}
            icon={FileText}
            onClick={() => navigate('/invoices')}
            variant="warning"
          />
          <StatPill
            label="Outstanding"
            value={`$${stats.outstandingTotal.toLocaleString()}`}
            sub={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'On track'}
            icon={DollarSign}
            onClick={() => navigate('/invoices')}
            variant={stats.overdueCount > 0 ? 'danger' : 'success'}
          />
          <StatPill
            label="Paid this month"
            value={`$${stats.paidThisMonth.toLocaleString()}`}
            sub={format(now, 'MMMM yyyy')}
            icon={TrendingUp}
            onClick={() => navigate('/invoices')}
            variant="success"
          />
        </div>
      </div>

      {/* Row 2: Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Priorities block */}
        <Card className="lg:col-span-5 flex flex-col min-h-0">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Priorities</h2>
            <span className="text-xs text-muted-foreground">Today & overdue</span>
          </div>
          <CardContent className="flex-1 overflow-hidden px-5 pb-4">
            {allPriorities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <CheckCircle className="h-10 w-10 text-primary/60 mb-3" />
                <p className="font-medium text-foreground">You're all caught up</p>
                <p className="text-xs text-muted-foreground mt-1">No urgent actions right now</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {allPriorities.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(item.link)}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${
                      item.urgency <= 2 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.context}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Payments + Tracking */}
        <div className="lg:col-span-7 grid grid-rows-2 gap-4 min-h-0">
          {/* Recent payments */}
          <Card className="flex flex-col min-h-0">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Payments</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/invoices')}>
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <CardContent className="flex-1 overflow-hidden px-5 pb-4">
              {stats.recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No recent payments</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {stats.recentPayments.map(p => {
                    const inv = getInvoiceForPayment(p.invoice_id);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                        <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                          <DollarSign className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">${p.amount.toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {inv ? getFacilityName(inv.facility_id) : 'Unknown'} · {format(new Date(p.payment_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking overview */}
          <Card className="flex flex-col min-h-0">
            <div className="px-5 pt-4 pb-2 shrink-0">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tracking Overview</h2>
            </div>
            <CardContent className="flex-1 overflow-hidden px-5 pb-4">
              {hasNoData ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">Get started by setting up your practice.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate('/facilities')}>
                      <Building2 className="mr-2 h-3.5 w-3.5" /> Add facility
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate('/schedule')}>
                      <CalendarDays className="mr-2 h-3.5 w-3.5" /> Add shift
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate('/invoices')}>
                      <FileText className="mr-2 h-3.5 w-3.5" /> Create invoice
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate('/credentials')}>
                      <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Add credential
                    </Button>
                  </div>
                </div>
              ) : trackingLines.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Everything looks good — no items needing attention.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {trackingLines.map((line, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors group"
                      onClick={() => navigate(line.link)}
                    >
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{line.label}</p>
                        <p className="text-sm font-semibold mt-0.5">{line.value}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

function StatPill({
  label, value, sub, icon: Icon, onClick, variant,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  onClick: () => void; variant: 'warning' | 'danger' | 'success';
}) {
  const styles = {
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
    success: 'bg-primary/10 text-primary',
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${styles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">{value}</p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
