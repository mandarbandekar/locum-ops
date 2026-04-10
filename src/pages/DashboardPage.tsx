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
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ReadinessItem } from '@/components/dashboard/WorkReadinessStrip';
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
    description: "Your next 7 days at a glance. See which clinics you're covering, track your shift streak, and jump straight to your schedule. Relief vets juggling multiple clinics can spot gaps or double-bookings instantly.",
    icon: CalendarDaysIcon2,
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="money"]',
    title: 'Money to Collect',
    description: "Track outstanding invoices, monthly revenue pace, and your oldest unpaid balance. LocumOps auto-generates invoices from your shifts — this card shows you who owes you money and how your cash flow is trending.",
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

function computeStreak(): number {
  try {
    const key = 'locumops_last_visits';
    const raw = localStorage.getItem(key);
    const visits: string[] = raw ? JSON.parse(raw) : [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Add today if not already there
    if (!visits.includes(todayStr)) {
      visits.push(todayStr);
      // Keep last 90 days only
      const recent = visits.slice(-90);
      localStorage.setItem(key, JSON.stringify(recent));
    }

    // Count consecutive days ending today
    const sorted = [...new Set(visits)].sort().reverse();
    if (sorted[0] !== todayStr) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const expected = format(new Date(new Date(sorted[0]).getTime() - i * 86400000), 'yyyy-MM-dd');
      if (sorted[i] === expected) streak++;
      else break;
    }
    return streak;
  } catch {
    return 0;
  }
}

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems, lineItems } = useData();
  const { user, isDemo } = useAuth();
  const { profile } = useUserProfile();
  const { profile: taxProfile, hasProfile: hasTaxProfile } = useTaxIntelligence();
  const { categories: reminderCategories } = useReminderPreferences();
  const navigate = useNavigate();
  const now = new Date();
  const { isOpen: tourOpen, isTourCompleted, startTour, closeTour } = useSpotlightTour();

  // Auto-start tour for new users (profile-backed, triggers once)
  useEffect(() => {
    if (!isTourCompleted && !isDemo && user) {
      const t = setTimeout(() => startTour(), 1500);
      return () => clearTimeout(t);
    }
  }, [isTourCompleted, isDemo, user]);

  // Listen for manual tour trigger from header button
  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener('locumops:start-tour', handler);
    return () => window.removeEventListener('locumops:start-tour', handler);
  }, [startTour]);

  // Getting started checklist dismiss
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    try { return localStorage.getItem('locumops_checklist_dismissed') === 'true'; } catch { return false; }
  });
  const handleDismissChecklist = () => {
    setChecklistDismissed(true);
    try { localStorage.setItem('locumops_checklist_dismissed', 'true'); } catch {}
  };

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

  // Streak
  const streakDays = useMemo(() => computeStreak(), []);

  // ── This week's earnings ──
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

  // ── 4-week sparkline data ──
  const weeklySparkline = useMemo(() => {
    return [3, 2, 1, 0].map(weeksAgo => {
      const wStart = startOfWeek(subWeeks(now, weeksAgo), { weekStartsOn: 1 });
      const wEnd = endOfWeek(subWeeks(now, weeksAgo), { weekStartsOn: 1 });
      return shifts
        .filter(s => {
          const d = parseISO(s.start_datetime);
          return isWithinInterval(d, { start: wStart, end: wEnd }) && new Date(s.end_datetime) < now;
        })
        .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    });
  }, [shifts, now]);

  // ── Monthly pace ──
  const monthlyPace = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, now]);

  // ── Oldest unpaid invoice ──
  const oldestUnpaid = useMemo(() => {
    const unpaid = invoices.filter(i => {
      const st = computeInvoiceStatus(i);
      return (st === 'sent' || st === 'partial' || st === 'overdue') && i.sent_at;
    });
    if (unpaid.length === 0) return undefined;
    const oldest = unpaid.reduce((a, b) => (a.sent_at! < b.sent_at! ? a : b));
    return {
      id: oldest.id,
      invoice_number: oldest.invoice_number,
      facility_name: getFacilityName(oldest.facility_id),
      daysOutstanding: differenceInDays(now, parseISO(oldest.sent_at!)),
    };
  }, [invoices, facilities, now]);

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
        const invDate = parseISO(inv.invoice_date);
        return isWithinInterval(invDate, { start: month, end: monthEnd });
      });
      const paid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
      const outstanding = monthInvoices.filter(i => {
        const st = computeInvoiceStatus(i);
        return st === 'sent' || st === 'partial' || st === 'overdue';
      }).reduce((s, i) => s + i.balance_due, 0);

      const invoicedShiftIds = new Set(
        monthInvoices.flatMap(inv => (inv as any).line_items?.map((li: any) => li.shift_id) || [])
      );
      const anticipatedShifts = shifts.filter(s => {
        const shiftDate = parseISO(s.start_datetime);
        return isWithinInterval(shiftDate, { start: month, end: monthEnd }) &&
          !invoicedShiftIds.has(s.id);
      });
      const anticipated = anticipatedShifts.reduce((s, sh) => s + sh.rate_applied, 0);

      return { month: format(month, 'MMM'), paid, outstanding, anticipated };
    });

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

    return { draftInvoices, unpaidInvoices, outstandingTotal, paidThisMonth, revenueData, invoiceItems };
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

    // Uninvoiced shifts
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

    // S-Corp nudge based on annualized income
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

    // Tax profile setup nudge
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

    const sorted = items.sort((a, b) => a.urgency - b.urgency);

    // Filter by user's reminder category preferences (in-app channel)
    return sorted.filter(item => {
      if (!item.module) return true;
      const catSetting = reminderCategories.find(c => c.category === item.module);
      if (!catSetting) return true;
      return catSetting.enabled && catSetting.in_app_enabled;
    });
  }, [invoices, summary, checklistItems, confirmationBreakdown, credentialsList, subscriptions, taxQuarters, reminderCategories, now]);

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

  // ── Daily Briefing computation ──
  const briefing = useMemo(() => {
    const todayShifts = shifts.filter(s => isToday(parseISO(s.start_datetime)));
    const todayEarnings = todayShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    const totalCollectable = summary.outstandingTotal;
    const overdueCount = invoices.filter(i => computeInvoiceStatus(i) === 'overdue').length;

    const parts: string[] = [];

    if (todayShifts.length > 0) {
      parts.push(`${todayShifts.length} shift${todayShifts.length > 1 ? 's' : ''} today worth $${todayEarnings.toLocaleString()}`);
    } else {
      parts.push('No shifts today');
    }

    if (thisWeekEarnings > 0) {
      parts.push(`$${thisWeekEarnings.toLocaleString()} earned this week`);
    }

    if (overdueCount > 0) {
      parts.push(`${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue`);
    } else if (totalCollectable > 0) {
      parts.push(`$${totalCollectable.toLocaleString()} to collect`);
    }

    // Next credential expiring within 60 days
    if (credentialsList) {
      const upcoming = credentialsList
        .filter(c => c.status !== 'archived' && c.expiration_date)
        .map(c => ({ title: c.custom_title, days: differenceInDays(parseISO(c.expiration_date!), now) }))
        .filter(c => c.days >= 0 && c.days <= 60)
        .sort((a, b) => a.days - b.days);
      if (upcoming.length > 0) {
        parts.push(`${upcoming[0].title} expires in ${upcoming[0].days}d`);
      }
    }

    // Tax deadline within 30 days
    const nextQ = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQ) {
      const dUntil = differenceInDays(new Date(nextQ.due_date), now);
      if (dUntil <= 30) {
        parts.push(`Q${nextQ.quarter} taxes due in ${dUntil}d`);
      }
    }

    return parts.join(' · ');
  }, [shifts, summary, invoices, thisWeekEarnings, credentialsList, taxQuarters, now]);

  // ── Tax snapshot for MoneyToCollectCard ──
  const taxSnapshot = useMemo(() => {
    if (!hasTaxProfile || !taxProfile) return undefined;
    const paidIncome = invoices.filter(i => i.paid_at).reduce((s, i) => s + i.total_amount, 0);
    if (paidIncome <= 0) return undefined;
    const monthsElapsed = Math.max(1, now.getMonth() + 1);
    const annualized = (paidIncome / monthsElapsed) * 12;
    const result = calculateTax(annualized, taxProfile);
    const quarterlyAmount = Math.round(result.totalAnnualTax / 4);
    const nextQ = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    return {
      quarterlyAmount,
      nextDueDate: nextQ?.due_date || null,
      nextQuarter: nextQ?.quarter || null,
    };
  }, [hasTaxProfile, taxProfile, invoices, taxQuarters, now]);

  return (
    <div className="space-y-4 h-full">
      {/* Daily Briefing Strip */}
      <div data-tour="briefing" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-[12px] sm:text-[13px] font-medium text-foreground">{briefing}</p>
      </div>

      {/* Getting Started Checklist */}
      {!isDemo && !checklistDismissed && (
        <GettingStartedChecklist onDismiss={handleDismissChecklist} />
      )}

      {/* Tax Savings Opportunities Card */}
      {(() => {
        const completedShifts = shifts.filter(s => new Date(s.end_datetime) < now).length;
        if (completedShifts < 4) {
          return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Tax Savings Strategies</p>
                <p className="text-xs text-muted-foreground">Log {4 - completedShifts} more shift{4 - completedShifts > 1 ? 's' : ''} to unlock personalized tax-saving strategies</p>
              </div>
            </div>
          );
        }
        const paidIncome = invoices.filter(i => i.paid_at).reduce((s, i) => s + i.total_amount, 0);
        const monthsElapsed = Math.max(1, now.getMonth() + 1);
        const annualized = (paidIncome / monthsElapsed) * 12;
        // Quick estimate of total savings (simplified)
        const estSavings = annualized > 80000
          ? Math.round(annualized * 0.04)
          : annualized > 50000
          ? Math.round(annualized * 0.025)
          : Math.round(annualized * 0.015);
        if (estSavings <= 0) return null;
        return (
          <Link
            to="/tax-center?tab=tax-strategies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors group"
          >
            <div className="p-2 rounded-full bg-emerald-500/10 shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">You could save up to ${estSavings.toLocaleString()} this year</p>
              <p className="text-xs text-muted-foreground">Personalized tax strategies based on your income</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </Link>
        );
      })()}

      {/* 3-Column Layout */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-12 lg:items-start">
        {/* Left: Upcoming Shifts */}
        <div data-tour="shifts" className="order-2 lg:order-none lg:col-span-4">
          <UpcomingShiftsCard
            shifts={shifts}
            getFacilityName={getFacilityName}
            greeting={`${greeting}, ${profile?.first_name || 'there'}`}
            firstName={profile?.first_name || 'there'}
            streakDays={streakDays}
          />
        </div>

        {/* Center: Money to Collect */}
        <div data-tour="money" className="order-3 lg:order-none lg:col-span-4">
           <MoneyToCollectCard
            outstandingTotal={summary.outstandingTotal}
            paidThisMonth={summary.paidThisMonth}
            revenueData={summary.revenueData}
            invoiceItems={summary.invoiceItems}
            thisWeekEarnings={thisWeekEarnings}
            monthlyPace={monthlyPace}
            oldestUnpaid={oldestUnpaid}
            weeklySparkline={weeklySparkline}
            taxSnapshot={taxSnapshot}
          />
        </div>

        {/* Right: Needs Attention */}
        <div data-tour="attention" className="order-first lg:order-none lg:col-span-4">
          <NeedsAttentionCard items={attentionItems} readinessItems={readinessItems} />
        </div>
      </div>

      {/* Spotlight Tour */}
      <SpotlightTour steps={TOUR_STEPS} isOpen={tourOpen} onClose={closeTour} />
    </div>
  );
}
