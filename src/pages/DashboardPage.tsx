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
import { format, differenceInDays, addMonths, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useCredentials } from '@/hooks/useCredentials';
import { generateCredentialReminders } from '@/lib/reminderEngine';
import { computeStatus as computeSubStatus } from '@/hooks/useSubscriptions';

import { UpcomingShiftsCard } from '@/components/dashboard/UpcomingShiftsCard';
import { MoneyToCollectCard } from '@/components/dashboard/MoneyToCollectCard';
import { NeedsAttentionCard, AttentionItem } from '@/components/dashboard/NeedsAttentionCard';
import { WorkReadinessStrip, ReadinessItem } from '@/components/dashboard/WorkReadinessStrip';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useUserProfile } from '@/contexts/UserProfileContext';

const dashDb = (table: string) => supabase.from(table as any);

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems } = useData();
  const { user, isDemo } = useAuth();
  const { profile } = useUserProfile();
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
    const draftInvoices = invoices.filter(i => i.status === 'draft');
    const draftTotal = draftInvoices.reduce((s, i) => s + i.total_amount, 0);

    const unpaidInvoices = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      return status === 'sent' || status === 'partial' || status === 'overdue';
    });
    const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.balance_due, 0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const paidThisMonth = payments
      .filter(p => { const d = new Date(p.payment_date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
      .reduce((s, p) => s + p.amount, 0);

    // Revenue data for mini chart (last 6 months)
    const months = eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 5)),
      end: endOfMonth(new Date()),
    });
    const revenueData = months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthInvoices = invoices.filter(inv => {
        const periodEnd = parseISO(inv.period_end);
        return isWithinInterval(periodEnd, { start: month, end: monthEnd });
      });
      const paid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
      const outstanding = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total_amount, 0);
      return { month: format(month, 'MMM'), paid, outstanding };
    });

    return { draftInvoices, draftTotal, unpaidInvoices, outstandingTotal, paidThisMonth, revenueData };
  }, [invoices, payments, now]);

  // ── Priorities / Attention items ──
  const { needingActionCount, getMonthQueue } = useClinicConfirmations();
  const { credentials: credentialsList } = useCredentials();

  const confirmationBreakdown = useMemo(() => {
    const nextMonth = addMonths(now, 1);
    const monthKey = format(nextMonth, 'yyyy-MM');
    const queue = getMonthQueue(monthKey);
    const manualReview = queue.filter(q => !(q.autoSendMonthly || q.autoSendPreshift) && (q.status === 'not_sent' || q.status === 'scheduled')).length;
    const needsUpdate = queue.filter(q => q.status === 'needs_update').length;
    const missingContact = queue.filter(q => !q.contactEmail && (q.monthlyEnabled || q.preshiftEnabled)).length;
    const autoSendSoon = queue.filter(q => (q.autoSendMonthly || q.autoSendPreshift) && (q.status === 'not_sent' || q.status === 'scheduled')).length;
    return { manualReview, needsUpdate, missingContact, autoSendSoon };
  }, [getMonthQueue, now]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    // Draft invoices (grouped)
    if (summary.draftInvoices.length > 0) {
      items.push({
        title: `${summary.draftInvoices.length} draft invoice${summary.draftInvoices.length > 1 ? 's' : ''}`,
        context: 'Ready to review and send',
        link: '/invoices', icon: FileText, urgency: 2,
        amount: `$${summary.draftTotal.toLocaleString()}`,
      });
    }

    // Overdue invoices
    const overdueInvoices = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((s, i) => s + i.balance_due, 0);
      items.push({
        title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}`,
        context: 'Follow up on late payments',
        link: '/invoices', icon: AlertTriangle, urgency: 1,
        amount: `$${overdueTotal.toLocaleString()}`,
      });
    }

    // Confirmations - manual review queue
    if (confirmationBreakdown.manualReview > 0) {
      items.push({
        title: `${confirmationBreakdown.manualReview} confirmation${confirmationBreakdown.manualReview > 1 ? 's' : ''} to review`,
        context: 'Review and send to clinic contacts',
        link: '/schedule', icon: CheckSquare, urgency: 3,
      });
    }

    // Confirmations - needs update
    if (confirmationBreakdown.needsUpdate > 0) {
      items.push({
        title: `${confirmationBreakdown.needsUpdate} confirmation${confirmationBreakdown.needsUpdate > 1 ? 's' : ''} need update`,
        context: 'Schedule changed after confirmation sent',
        link: '/schedule', icon: AlertTriangle, urgency: 2,
      });
    }

    // Missing contacts
    if (confirmationBreakdown.missingContact > 0) {
      items.push({
        title: `${confirmationBreakdown.missingContact} facilit${confirmationBreakdown.missingContact > 1 ? 'ies' : 'y'} missing contact`,
        context: 'Add scheduling contact to enable confirmations',
        link: '/schedule', icon: AlertTriangle, urgency: 5,
      });
    }

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

    // Subscriptions due soon
    const dueSoonSubs = subscriptions.filter(s => computeSubStatus(s.renewal_date, s.status) === 'due_soon');
    if (dueSoonSubs.length > 0) {
      items.push({
        title: `${dueSoonSubs.length} subscription${dueSoonSubs.length > 1 ? 's' : ''} renewing soon`,
        context: 'Review upcoming renewals',
        link: '/credentials?tab=subscriptions', icon: ShieldAlert, urgency: 6,
      });
    }

    // Tax quarter
    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      if (daysUntil <= 30) {
        items.push({
          title: `Q${nextQuarter.quarter} estimated tax due`,
          context: `Due in ${daysUntil} days`,
          link: '/business?tab=tax-strategy&subtab=tracker', icon: DollarSign, urgency: 4,
        });
      }
    }

    return items.sort((a, b) => a.urgency - b.urgency);
  }, [invoices, summary, checklistItems, confirmationBreakdown, credentialsList, subscriptions, taxQuarters, now]);

  // ── Work Readiness ──
  const readinessItems = useMemo(() => {
    const lines: ReadinessItem[] = [];

    if (confirmationBreakdown.manualReview > 0 || confirmationBreakdown.needsUpdate > 0) {
      const total = confirmationBreakdown.manualReview + confirmationBreakdown.needsUpdate;
      lines.push({ text: `Confirmations: ${total} need${total > 1 ? '' : 's'} action`, link: '/schedule' });
    }

    const dueSoonChecklist = checklistItems.filter(item => {
      const badge = getChecklistBadge(item);
      return badge === 'due_soon' || badge === 'overdue';
    });
    if (dueSoonChecklist.length > 0) {
      lines.push({ text: `Contracts: ${dueSoonChecklist.length} item${dueSoonChecklist.length > 1 ? 's' : ''} due soon`, link: '/facilities' });
    }

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

    if (taxChecklist.length > 0) {
      const completed = taxChecklist.filter(c => c.completed).length;
      const percent = Math.round((completed / taxChecklist.length) * 100);
      if (percent < 100) lines.push({ text: `Tax readiness: ${percent}%`, link: '/business?tab=tax-strategy&subtab=tracker' });
    }

    return lines;
  }, [checklistItems, taxChecklist, confirmationBreakdown, credentialsList, now]);

  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  })();

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-end">
        <QuickActions />
      </div>

      {/* 3-Column Layout */}
      <div className="grid gap-5 lg:grid-cols-12" style={{ minHeight: 'calc(100vh - 190px)' }}>
        {/* Left: Upcoming Shifts */}
        <div className="lg:col-span-4">
          <UpcomingShiftsCard
            shifts={shifts}
            getFacilityName={getFacilityName}
            greeting={`${greeting}, ${profile?.first_name || 'there'}`}
            firstName={profile?.first_name || 'there'}
          />
        </div>

        {/* Center: Money to Collect */}
        <div className="lg:col-span-4">
          <MoneyToCollectCard
            outstandingTotal={summary.outstandingTotal}
            draftTotal={summary.draftTotal}
            paidThisMonth={summary.paidThisMonth}
            revenueData={summary.revenueData}
            invoiceItems={summary.invoiceItems}
          />
        </div>

        {/* Right: Needs Attention */}
        <div className="lg:col-span-4">
          <NeedsAttentionCard items={attentionItems} />
        </div>
      </div>

      {/* Work Readiness Strip */}
      <WorkReadinessStrip items={readinessItems} />
    </div>
  );
}
