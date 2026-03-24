import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, FileText, DollarSign, AlertTriangle, ArrowRight,
  Send, ShieldAlert, CheckSquare,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { format, differenceInDays } from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useCredentials } from '@/hooks/useCredentials';
import { generateCredentialReminders } from '@/lib/reminderEngine';
import { computeStatus as computeSubStatus } from '@/hooks/useSubscriptions';

import { SummaryCard } from '@/components/dashboard/SummaryCards';
import { PrioritiesCard, PriorityItem } from '@/components/dashboard/PrioritiesCard';
import { ThisWeekCard } from '@/components/dashboard/ThisWeekCard';
import { WorkReadinessStrip, ReadinessItem } from '@/components/dashboard/WorkReadinessStrip';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useUserProfile } from '@/contexts/UserProfileContext';

const dashDb = (table: string) => supabase.from(table as any);

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems } = useData();
  const { user, isDemo } = useAuth();
  const { profile } = useUserProfile();
  const showSetupCard = false; // Setup assistant hidden for now
  const navigate = useNavigate();
  const now = new Date();

  // Tax & subscription data
  const [taxChecklist, setTaxChecklist] = useState<{ completed: boolean }[]>([]);
  const [taxQuarters, setTaxQuarters] = useState<{ quarter: number; due_date: string; status: string }[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ name: string; renewal_date: string | null; status: string; archived_at: string | null }[]>([]);

  useEffect(() => {
    if (isDemo || !user) return;
    Promise.all([
      dashDb('tax_checklist_items').select('completed'),
      dashDb('tax_quarter_statuses').select('quarter,due_date,status').eq('tax_year', now.getFullYear()).order('quarter'),
      dashDb('required_subscriptions').select('name,renewal_date,status,archived_at').is('archived_at', null),
    ]).then(([clRes, qsRes, subRes]) => {
      if (clRes.data) setTaxChecklist(clRes.data as any[]);
      if (qsRes.data) setTaxQuarters(qsRes.data as any[]);
      if (subRes.data) setSubscriptions(subRes.data as any[]);
    });
  }, [user?.id, isDemo]);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  // ── Summary data ──
  const summary = useMemo(() => {
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingShifts = shifts.filter(s =>
      new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in7Days &&
      (s.status === 'booked' || s.status === 'proposed')
    );

    const draftInvoices = invoices.filter(i => i.status === 'draft');
    const draftTotal = draftInvoices.reduce((s, i) => s + i.total_amount, 0);

    const unpaidInvoices = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      return status === 'sent' || status === 'partial' || status === 'overdue';
    });
    const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.balance_due, 0);

    const dueSoonChecklist = checklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });

    return { upcomingShifts, draftInvoices, draftTotal, unpaidInvoices, outstandingTotal, dueSoonChecklist };
  }, [shifts, invoices, checklistItems, now]);

  // ── Priorities ──
  const { needingActionCount } = useClinicConfirmations();
  const { credentials: credentialsList } = useCredentials();

  const allPriorities = useMemo(() => {
    const items: PriorityItem[] = [];

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
        title: `Review and send ${inv.invoice_number}`,
        context: `$${inv.total_amount.toLocaleString()} ready to send`,
        link: `/invoices/${inv.id}`, icon: Send, urgency: 2,
      });
    });

    // Confirmations
    if (needingActionCount > 0) {
      items.push({
        title: `${needingActionCount} confirmation${needingActionCount > 1 ? 's' : ''} need action`,
        context: 'Review and send monthly shift confirmations',
        link: '/schedule', icon: CheckSquare, urgency: 4,
      });
    }

    // Upcoming shifts in 48h
    const in48h = new Date(now);
    in48h.setHours(in48h.getHours() + 48);
    shifts
      .filter(s => new Date(s.start_datetime) >= now && new Date(s.start_datetime) <= in48h && (s.status === 'booked' || s.status === 'proposed'))
      .forEach(s => {
        items.push({
          title: `Shift at ${getFacilityName(s.facility_id)}`,
          context: format(new Date(s.start_datetime), 'EEE, MMM d · h:mm a'),
          link: '/schedule', icon: CalendarDays, urgency: 5,
        });
      });

    // Checklist items
    checklistItems
      .filter(item => getChecklistBadge(item) === 'due_soon' || getChecklistBadge(item) === 'overdue')
      .forEach(item => {
        const badge = getChecklistBadge(item);
        const days = differenceInDays(new Date(item.due_date!), now);
        items.push({
          title: item.title,
          context: badge === 'overdue' ? 'Overdue' : `Due in ${days} days`,
          link: '/facilities', icon: ShieldAlert, urgency: badge === 'overdue' ? 3 : 8,
        });
      });

    // Credential renewals
    if (credentialsList) {
      generateCredentialReminders(credentialsList, now, 30).forEach(r => {
        items.push({ title: r.title, context: r.body, link: r.link, icon: ShieldAlert, urgency: r.urgency });
      });
    }

    return items.sort((a, b) => a.urgency - b.urgency).slice(0, 7);
  }, [invoices, shifts, facilities, checklistItems, needingActionCount, credentialsList, now]);

  // ── This Week data ──
  const thisWeek = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const paidThisMonth = payments
      .filter(p => { const d = new Date(p.payment_date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
      .reduce((s, p) => s + p.amount, 0);

    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 3);

    const nextShift = shifts
      .filter(s => new Date(s.start_datetime) >= now && (s.status === 'booked' || s.status === 'proposed'))
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())[0] || null;

    return { paidThisMonth, recentPayments, nextShift };
  }, [payments, shifts, now]);

  // ── Work Readiness ──
  const readinessItems = useMemo(() => {
    const lines: ReadinessItem[] = [];

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

    // Credentials
    if (credentialsList) {
      const expiringSoon = credentialsList.filter(c => {
        if (c.status === 'archived') return false;
        if (!c.expiration_date) return false;
        const days = differenceInDays(new Date(c.expiration_date), now);
        return days >= 0 && days <= 30;
      });
      if (expiringSoon.length > 0) {
        lines.push({ text: `Credentials: ${expiringSoon.length} renewal${expiringSoon.length > 1 ? 's' : ''} soon`, link: '/credentials' });
      }
    }

    // Subscriptions
    const dueSoonSubs = subscriptions.filter(s => computeSubStatus(s.renewal_date, s.status) === 'due_soon');
    if (dueSoonSubs.length > 0) {
      lines.push({ text: `Subscriptions: ${dueSoonSubs.length} renewal${dueSoonSubs.length > 1 ? 's' : ''} soon`, link: '/credentials?tab=subscriptions' });
    }

    // Tax readiness
    if (taxChecklist.length > 0) {
      const completed = taxChecklist.filter(c => c.completed).length;
      const percent = Math.round((completed / taxChecklist.length) * 100);
      if (percent < 100) lines.push({ text: `Tax readiness: ${percent}%`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      lines.push({ text: `Taxes: Q${nextQuarter.quarter} due in ${daysUntil} days`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    return lines;
  }, [checklistItems, taxChecklist, taxQuarters, needingActionCount, credentialsList, subscriptions, now]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">
          {(() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
            return `${greeting}, ${profile?.first_name || 'there'}`;
          })()}
        </h1>
        <QuickActions />
      </div>

      {/* Setup card hidden for now */}

      {/* Row 1: 4 Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={CalendarDays}
          title="Upcoming Shifts"
          value={summary.upcomingShifts.length}
          subtitle={summary.upcomingShifts.length > 0
            ? `${summary.upcomingShifts.length} in next 7 days`
            : 'No upcoming shifts'}
          onClick={() => navigate('/schedule')}
          accentClass="text-primary"
          bgClass="bg-primary/10"
        />
        <SummaryCard
          icon={FileText}
          title="Ready to Invoice"
          value={`$${summary.draftTotal.toLocaleString()}`}
          subtitle={summary.draftInvoices.length > 0
            ? `$${summary.draftTotal.toLocaleString()} across ${summary.draftInvoices.length} draft${summary.draftInvoices.length > 1 ? 's' : ''}`
            : 'No drafts ready'}
          onClick={() => navigate('/invoices')}
          accentClass="text-warning"
          bgClass="bg-warning/10"
        />
        <SummaryCard
          icon={DollarSign}
          title="Outstanding"
          value={`$${summary.outstandingTotal.toLocaleString()}`}
          subtitle={summary.unpaidInvoices.length > 0
            ? `${summary.unpaidInvoices.length} invoice${summary.unpaidInvoices.length > 1 ? 's' : ''} awaiting payment`
            : '0 unpaid invoices'}
          onClick={() => navigate('/invoices')}
          accentClass="text-success"
          bgClass="bg-success/10"
        />
        <SummaryCard
          icon={ShieldAlert}
          title="Due Soon"
          value={summary.dueSoonChecklist.length}
          subtitle={summary.dueSoonChecklist.length > 0
            ? `${summary.dueSoonChecklist.length} item${summary.dueSoonChecklist.length > 1 ? 's' : ''} need attention`
            : 'No urgent admin items'}
          onClick={() => navigate('/facilities')}
          accentClass="text-destructive"
          bgClass="bg-destructive/10"
        />
      </div>

      {/* Row 2: Priorities + This Week */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PrioritiesCard items={allPriorities} maxVisible={5} />
        </div>
        <div className="lg:col-span-4">
          <ThisWeekCard
            paidThisMonth={thisWeek.paidThisMonth}
            recentPayments={thisWeek.recentPayments}
            nextShift={thisWeek.nextShift}
            getFacilityName={getFacilityName}
          />
        </div>
      </div>

      {/* Row 3: Work Readiness Strip */}
      <WorkReadinessStrip items={readinessItems} />
    </div>
  );
}
