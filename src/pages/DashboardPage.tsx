import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays, FileText, DollarSign, AlertTriangle, ArrowRight,
  Send, ShieldAlert, CheckSquare, Zap, Clock, Calculator, Lightbulb, TrendingUp,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { format, differenceInDays, differenceInHours, addMonths, subMonths, startOfMonth, endOfMonth, endOfDay, startOfWeek, endOfWeek, subWeeks, eachMonthOfInterval, isWithinInterval, isToday, isAfter, parseISO } from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useCredentials } from '@/hooks/useCredentials';
import { generateCredentialReminders, generateUninvoicedShiftReminders } from '@/lib/reminderEngine';
import { computeStatus as computeSubStatus } from '@/hooks/useSubscriptions';
import { useReminderPreferences } from '@/hooks/useReminderPreferences';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';
import { calculateTax } from '@/components/tax-intelligence/TaxDashboard';

import { UpcomingShiftsCard } from '@/components/dashboard/UpcomingShiftsCard';
import { MoneyToCollectCard } from '@/components/dashboard/MoneyToCollectCard';
import { NeedsAttentionCard, AttentionItem, type ReminderModule } from '@/components/dashboard/NeedsAttentionCard';
import { DashboardPromptCards } from '@/components/dashboard/DashboardPromptCards';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { SpotlightTour, TourStep } from '@/components/SpotlightTour';
import { useSpotlightTour } from '@/hooks/useSpotlightTour';
import {
  LayoutDashboard, Building2, CalendarDays as CalendarDaysIcon2, FileText as FileText2,
  Activity, Landmark,
} from 'lucide-react';

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="briefing"]',
    title: 'Your Daily Briefing',
    description: "A personalized summary of what needs your attention today — upcoming shifts, overdue invoices, expiring credentials, and tax deadlines. This updates every time you open LocumOps so you always know where things stand.",
    icon: Zap,
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="shifts"]',
    title: 'Upcoming Shifts',
    description: "Your next 7 days at a glance. See which clinics you're covering and jump straight to your schedule. Relief vets juggling multiple clinics can spot gaps or double-bookings instantly.",
    icon: CalendarDaysIcon2,
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="money"]',
    title: 'Money to Collect',
    description: "Track outstanding invoices and monthly collections. LocumOps auto-generates invoices from your shifts — this card shows you who owes you money.",
    icon: DollarSign,
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="attention"]',
    title: 'Needs Attention',
    description: "Your prioritized action list: overdue invoices to follow up on, credentials about to expire, unconfirmed shifts, and upcoming tax deadlines. Items are sorted by urgency so you always know what to handle first.",
    icon: AlertTriangle,
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="facilities"]',
    title: 'Clinics & Facilities',
    description: "Your clinic CRM. Store contact info, billing preferences, day rates, and contract checklists for every practice you work with. When you log shifts, invoices auto-generate based on each clinic's billing cadence.",
    icon: Building2,
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="schedule"]',
    title: 'Schedule',
    description: "A visual weekly calendar built for locum work. Book shifts, block personal time, detect conflicts, and send clinic confirmations. Shifts you log here flow directly into invoicing and tax tracking.",
    icon: CalendarDaysIcon2,
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="invoices"]',
    title: 'Invoices & Payments',
    description: "Invoices are auto-created from your shifts — no spreadsheets needed. Review drafts, send to clinics via secure links, track payment status, and set up auto-reminders for overdue balances.",
    icon: FileText2,
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="business"]',
    title: 'Relief Business Hub',
    description: "Your financial command center. Revenue reports, facility-level analytics, and performance insights help you understand which clinics are most profitable and where your income is trending.",
    icon: Activity,
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="tax"]',
    title: 'Tax Intelligence',
    description: "Estimated quarterly tax calculations based on your actual shift income. Track IRS payment deadlines, see your effective tax rate, and get S-Corp assessment nudges — all using 2026 tax brackets.",
    icon: Landmark,
    placement: 'right',
  },
];

const dashDb = (table: string) => supabase.from(table as any);

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems, lineItems } = useData();
  const { user, isDemo } = useAuth();
  const { profile } = useUserProfile();
  const { profile: taxProfile, hasProfile: hasTaxProfile } = useTaxIntelligence();
  const { categories: reminderCategories } = useReminderPreferences();
  const navigate = useNavigate();
  const now = new Date();
  const { isOpen: tourOpen, isTourCompleted, startTour, closeTour } = useSpotlightTour();

  // Auto-start tour for new users
  useEffect(() => {
    if (!isTourCompleted && !isDemo && user) {
      const t = setTimeout(() => startTour(), 1500);
      return () => clearTimeout(t);
    }
  }, [isTourCompleted, isDemo, user]);

  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener('locumops:start-tour', handler);
    return () => window.removeEventListener('locumops:start-tour', handler);
  }, [startTour]);

  // Tax & subscription data
  const [taxQuarters, setTaxQuarters] = useState<{ quarter: number; due_date: string; status: string }[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ name: string; renewal_date: string | null; status: string; archived_at: string | null }[]>([]);

  useEffect(() => {
    if (isDemo || !user) return;
    Promise.all([
      dashDb('tax_quarter_statuses').select('quarter,due_date,status').eq('tax_year', now.getFullYear()).order('quarter'),
      dashDb('required_subscriptions').select('name,renewal_date,status,archived_at').is('archived_at', null),
    ]).then(([qsRes, subRes]) => {
      if (qsRes.data) setTaxQuarters(qsRes.data as any[]);
      if (subRes.data) setSubscriptions(subRes.data as any[]);
    });
  }, [user?.id, isDemo]);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  // ── This week's earnings (for briefing bar) ──
  const thisWeekEarnings = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return isWithinInterval(d, { start: weekStart, end: weekEnd }) && new Date(s.end_datetime) < now;
      })
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, now]);

  // ── Summary data ──
  const summary = useMemo(() => {
    const draftInvoices = invoices.filter(i => i.status === 'draft');

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

    const todayEnd = endOfDay(now);
    const readyToReviewInvoices = draftInvoices.filter(inv =>
      inv.invoice_date && !isAfter(parseISO(inv.invoice_date), todayEnd)
    );

    const invoiceItems = readyToReviewInvoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      facility_name: getFacilityName(inv.facility_id),
      total_amount: inv.total_amount,
      balance_due: inv.balance_due,
      status: computeInvoiceStatus(inv),
      due_date: inv.due_date,
    }));

    return { draftInvoices, unpaidInvoices, outstandingTotal, paidThisMonth, invoiceItems };
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
    return { manualReview, needsUpdate, missingContact };
  }, [getMonthQueue, now]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    if (summary.draftInvoices.length > 0) {
      items.push({
        title: `${summary.draftInvoices.length} draft invoice${summary.draftInvoices.length > 1 ? 's' : ''}`,
        context: 'Ready to review and send',
        link: '/invoices', icon: FileText, urgency: 2,
        amount: `$${summary.draftInvoices.reduce((s, i) => s + i.total_amount, 0).toLocaleString()}`,
        module: 'invoices',
      });
    }

    const overdueInvoices = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((s, i) => s + i.balance_due, 0);
      items.push({
        title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}`,
        context: 'Follow up on late payments',
        link: '/invoices', icon: AlertTriangle, urgency: 1,
        amount: `$${overdueTotal.toLocaleString()}`,
        module: 'invoices',
      });
    }

    if (confirmationBreakdown.manualReview > 0) {
      items.push({
        title: `${confirmationBreakdown.manualReview} confirmation${confirmationBreakdown.manualReview > 1 ? 's' : ''} to review`,
        context: 'Review and send to clinic contacts',
        link: '/schedule', icon: CheckSquare, urgency: 3,
        module: 'confirmations',
      });
    }

    if (confirmationBreakdown.needsUpdate > 0) {
      items.push({
        title: `${confirmationBreakdown.needsUpdate} confirmation${confirmationBreakdown.needsUpdate > 1 ? 's' : ''} need update`,
        context: 'Schedule changed after confirmation sent',
        link: '/schedule', icon: AlertTriangle, urgency: 2,
        module: 'confirmations',
      });
    }

    if (confirmationBreakdown.missingContact > 0) {
      items.push({
        title: `${confirmationBreakdown.missingContact} facilit${confirmationBreakdown.missingContact > 1 ? 'ies' : 'y'} missing contact`,
        context: 'Add scheduling contact to enable confirmations',
        link: '/schedule', icon: AlertTriangle, urgency: 5,
        module: 'confirmations',
      });
    }

    checklistItems
      .filter(item => getChecklistBadge(item) === 'due_soon' || getChecklistBadge(item) === 'overdue')
      .forEach(item => {
        const badge = getChecklistBadge(item);
        const days = differenceInDays(new Date(item.due_date!), now);
        items.push({
          title: item.title,
          context: badge === 'overdue' ? 'Overdue' : `Due in ${days} days`,
          link: '/facilities', icon: ShieldAlert, urgency: badge === 'overdue' ? 3 : 8,
          module: 'contracts',
        });
      });

    if (credentialsList) {
      generateCredentialReminders(credentialsList, now, 30).forEach(r => {
        items.push({ title: r.title, context: r.body, link: r.link, icon: ShieldAlert, urgency: r.urgency, module: 'credentials' });
      });
    }

    generateUninvoicedShiftReminders(shifts, lineItems, getFacilityName, now).forEach(r => {
      items.push({ title: r.title, context: r.body, link: r.link, icon: Clock, urgency: r.urgency, module: 'invoices' });
    });

    const dueSoonSubs = subscriptions.filter(s => computeSubStatus(s.renewal_date, s.status) === 'due_soon');
    if (dueSoonSubs.length > 0) {
      items.push({
        title: `${dueSoonSubs.length} subscription${dueSoonSubs.length > 1 ? 's' : ''} renewing soon`,
        context: 'Review upcoming renewals',
        link: '/credentials?tab=subscriptions', icon: ShieldAlert, urgency: 6,
        module: 'credentials',
      });
    }

    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      if (daysUntil <= 30) {
        items.push({
          title: `Q${nextQuarter.quarter} estimated tax due`,
          context: `Due in ${daysUntil} days`,
          link: '/business?tab=tax-strategy&subtab=tracker', icon: DollarSign, urgency: 4,
          module: 'taxes',
        });
      }
    }

    const paidIncome = invoices
      .filter(i => i.paid_at)
      .reduce((s, i) => s + i.total_amount, 0);
    const monthsElapsed = Math.max(1, now.getMonth() + 1);
    const annualizedIncome = (paidIncome / monthsElapsed) * 12;
    if (annualizedIncome >= 80000 && paidIncome > 0) {
      items.push({
        title: 'S-Corp structure may be worth exploring',
        context: 'Your income is in the range commonly reviewed',
        link: '/business?tab=tax-advisor&advisortab=scorp', icon: DollarSign, urgency: 9,
        module: 'taxes',
      });
    }

    if (!hasTaxProfile) {
      const hasPaidInvoice = invoices.some(i => i.paid_at);
      if (hasPaidInvoice) {
        items.push({
          title: 'Set up your tax profile',
          context: 'See how much to set aside from each shift',
          link: '/tax-center', icon: Calculator, urgency: 10,
          module: 'taxes',
        });
      }
    }

    // Tax savings nudge as attention item
    const completedShifts = shifts.filter(s => new Date(s.end_datetime) < now).length;
    if (completedShifts >= 4 && annualizedIncome > 0) {
      const estSavings = annualizedIncome > 80000
        ? Math.round(annualizedIncome * 0.04)
        : annualizedIncome > 50000
        ? Math.round(annualizedIncome * 0.025)
        : Math.round(annualizedIncome * 0.015);
      if (estSavings > 0) {
        items.push({
          title: `Potential tax savings: ~$${estSavings.toLocaleString()}/yr`,
          context: 'Personalized strategies based on your income',
          link: '/tax-center?tab=tax-strategies', icon: TrendingUp, urgency: 11,
          module: 'taxes',
        });
      }
    }

    const sorted = items.sort((a, b) => a.urgency - b.urgency);

    return sorted.filter(item => {
      if (!item.module) return true;
      const catSetting = reminderCategories.find(c => c.category === item.module);
      if (!catSetting) return true;
      return catSetting.enabled && catSetting.in_app_enabled;
    });
  }, [invoices, summary, checklistItems, confirmationBreakdown, credentialsList, subscriptions, taxQuarters, reminderCategories, shifts, hasTaxProfile, now]);

  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  })();

  // ── Compact briefing line ──
  const briefing = useMemo(() => {
    const todayShifts = shifts.filter(s => isToday(parseISO(s.start_datetime)));
    const parts: string[] = [];

    if (todayShifts.length > 0) {
      parts.push(`${todayShifts.length} shift${todayShifts.length > 1 ? 's' : ''} today`);
    }

    if (thisWeekEarnings > 0) {
      parts.push(`$${thisWeekEarnings.toLocaleString()} this week`);
    }

    if (summary.outstandingTotal > 0) {
      parts.push(`$${summary.outstandingTotal.toLocaleString()} to collect`);
    }

    return parts.join(' · ');
  }, [shifts, thisWeekEarnings, summary.outstandingTotal, now]);

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.6)-theme(spacing.10))] overflow-hidden">
      {/* Compact greeting bar */}
      <div data-tour="briefing" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 shrink-0">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-[12px] sm:text-[13px] font-medium text-foreground truncate">
          {greeting}, {profile?.first_name || 'there'}{briefing ? ` · ${briefing}` : ''}
        </p>
      </div>

      {/* Contextual prompt cards */}
      <DashboardPromptCards
        credentialCount={credentialsList?.length ?? 0}
        shiftCount={shifts.length}
        hasSentInvoice={invoices.some(i => i.status === 'sent' || i.sent_at)}
        userCreatedAt={user?.created_at}
      />

      {/* 3-Column Layout */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-12 lg:items-stretch mt-3 flex-1 min-h-0">
        {/* Left: Upcoming Shifts */}
        <div data-tour="shifts" className="order-2 lg:order-none lg:col-span-4 min-h-0">
          <UpcomingShiftsCard
            shifts={shifts}
            getFacilityName={getFacilityName}
            greeting={`${greeting}, ${profile?.first_name || 'there'}`}
            firstName={profile?.first_name || 'there'}
          />
        </div>

        {/* Center: Money to Collect */}
        <div data-tour="money" className="order-3 lg:order-none lg:col-span-4 min-h-0">
          <MoneyToCollectCard
            outstandingTotal={summary.outstandingTotal}
            paidThisMonth={summary.paidThisMonth}
            invoiceItems={summary.invoiceItems}
          />
        </div>

        {/* Right: Needs Attention */}
        <div data-tour="attention" className="order-first lg:order-none lg:col-span-4 min-h-0">
          <NeedsAttentionCard items={attentionItems} />
        </div>
      </div>

      {/* Spotlight Tour */}
      <SpotlightTour steps={TOUR_STEPS} isOpen={tourOpen} onClose={closeTour} />
    </div>
  );
}
