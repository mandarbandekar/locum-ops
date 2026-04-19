import { useMemo, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, FileText, DollarSign, AlertTriangle,
  ShieldAlert, CheckSquare, Zap, Clock, Calculator, TrendingUp, X,
} from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { AddFacilityDialog } from '@/components/AddFacilityDialog';
import { ShiftFormDialog } from '@/components/schedule/ShiftFormDialog';
import {
  format, differenceInDays, addMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, subMonths, isWithinInterval, isToday, isAfter, parseISO, addDays,
} from 'date-fns';
import { getChecklistBadge } from '@/types/contracts';
import { useClinicConfirmations } from '@/hooks/useClinicConfirmations';
import { useCredentials } from '@/hooks/useCredentials';
import { generateCredentialReminders, generateUninvoicedShiftReminders } from '@/lib/reminderEngine';
import { computeStatus as computeSubStatus } from '@/hooks/useSubscriptions';
import { useReminderPreferences } from '@/hooks/useReminderPreferences';
import { useTaxIntelligence } from '@/hooks/useTaxIntelligence';

import { NeedsAttentionCard, AttentionItem, type ReminderModule } from '@/components/dashboard/NeedsAttentionCard';
import { DashboardPromptCards } from '@/components/dashboard/DashboardPromptCards';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { SpotlightTour, TourStep } from '@/components/SpotlightTour';
import { useSpotlightTour } from '@/hooks/useSpotlightTour';
import {
  Building2, CalendarDays as CalendarDaysIcon2, FileText as FileText2,
  Activity, Landmark,
} from 'lucide-react';

import { BriefingBanner } from '@/components/dashboard/BriefingBanner';
import { MoneyPipeline, PipelineStage } from '@/components/dashboard/MoneyPipeline';
import { AttentionGroupedList } from '@/components/dashboard/AttentionGroupedList';
import { generateDashboardBriefing, getNextQuarterlyDeadline, BriefingInput } from '@/lib/dashboardBriefing';

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="briefing"]',
    title: 'Your Daily Briefing',
    description: "A personalized summary of what's coming up — shifts, invoices, and credentials. Updates every time you open LocumOps.",
    icon: Zap, placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="pipeline"]',
    title: 'Money Pipeline',
    description: "Track every dollar from shift to bank — completed work, invoices sent, what's due, what's overdue, and what you've collected this month.",
    icon: DollarSign, placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="attention"]',
    title: 'Needs Your Attention',
    description: "Your prioritized action list, grouped by Payments, Credentials, and Schedule.",
    icon: AlertTriangle, placement: 'top',
  },
  {
    targetSelector: '[data-tour="facilities"]',
    title: 'Clinics & Facilities',
    description: "Your clinic CRM. Store contact info, billing preferences, day rates, and contract checklists.",
    icon: Building2, placement: 'right',
  },
  {
    targetSelector: '[data-tour="schedule"]',
    title: 'Schedule',
    description: "A visual weekly calendar built for locum work.",
    icon: CalendarDaysIcon2, placement: 'right',
  },
  {
    targetSelector: '[data-tour="invoices"]',
    title: 'Invoices & Payments',
    description: "Invoices auto-created from your shifts.",
    icon: FileText2, placement: 'right',
  },
  {
    targetSelector: '[data-tour="business"]',
    title: 'Relief Business Hub',
    description: "Your financial command center.",
    icon: Activity, placement: 'right',
  },
  {
    targetSelector: '[data-tour="tax"]',
    title: 'Tax Intelligence',
    description: "Estimated quarterly tax calculations based on your actual shift income.",
    icon: Landmark, placement: 'right',
  },
];

const dashDb = (table: string) => supabase.from(table as any);

export default function DashboardPage() {
  const { shifts, invoices, facilities, payments, checklistItems, lineItems, addShift } = useData();
  const { user, isDemo } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const { hasProfile: hasTaxProfile } = useTaxIntelligence();
  const { categories: reminderCategories } = useReminderPreferences();
  const navigate = useNavigate();
  const now = new Date();
  const { isOpen: tourOpen, isTourCompleted, startTour, closeTour } = useSpotlightTour();

  const [addClinicOpen, setAddClinicOpen] = useState(false);
  const [addShiftOpen, setAddShiftOpen] = useState(false);

  const skippedOnboarding = profile && !profile.onboarding_completed_at && profile.has_seen_welcome;
  const showWelcomeBanner = skippedOnboarding && !profile?.dismissed_prompts?.welcome_banner && facilities.length === 0 && shifts.length === 0;

  const dismissWelcomeBanner = useCallback(async () => {
    await updateProfile({
      dismissed_prompts: { ...profile?.dismissed_prompts, welcome_banner: true },
    });
  }, [profile, updateProfile]);

  const showGettingStarted = !profile?.dismissed_prompts?.getting_started && (facilities.length === 0 || shifts.length === 0);

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

  // ── Briefing data ──
  const briefingData = useMemo(() => {
    const weekEnd = addDays(now, 7);
    const upcomingShifts = shifts.filter(s => {
      const d = parseISO(s.start_datetime);
      return d >= now && d <= weekEnd;
    });
    const shiftTotal = upcomingShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthShifts = shifts.filter(s => {
      const d = parseISO(s.end_datetime);
      return d >= lastMonthStart && d <= lastMonthEnd && d < now;
    });
    const lastMonthTotal = lastMonthShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

    const overdueInvs = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
    const overdueTotal = overdueInvs.reduce((s, i) => s + i.balance_due, 0);

    const dueSoonInvs = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      if (status !== 'sent' && status !== 'partial') return false;
      if (!i.due_date) return false;
      const due = parseISO(i.due_date);
      return due >= now && due <= weekEnd;
    });
    const dueSoonTotal = dueSoonInvs.reduce((s, i) => s + i.balance_due, 0);

    return {
      shiftCount: upcomingShifts.length,
      shiftTotal,
      lastMonthShiftCount: lastMonthShifts.length,
      lastMonthTotal,
      overdueCount: overdueInvs.length,
      overdueTotal,
      dueSoonCount: dueSoonInvs.length,
      dueSoonTotal,
    };
  }, [shifts, invoices, now]);

  // ── Money Pipeline stages ──
  const pipeline = useMemo(() => {
    const weekEnd = addDays(now, 7);
    const invoicedShiftIds = new Set(
      lineItems.filter(li => li.shift_id).map(li => li.shift_id!)
    );

    // 1. COMPLETED but not invoiced
    const completedNotInvoiced = shifts.filter(s => {
      const ended = parseISO(s.end_datetime) < now;
      return ended && !invoicedShiftIds.has(s.id);
    });
    const completedTotal = completedNotInvoiced.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

    // 2. INVOICED — sent, due_date > today (and not within next 7 days bucket)
    const invoicedSent = invoices.filter(i => {
      if (i.status !== 'sent' && i.status !== 'partial') return false;
      if (!i.due_date) return true; // sent but no due date
      const due = parseISO(i.due_date);
      return due > weekEnd && due >= now;
    });
    const invoicedTotal = invoicedSent.reduce((s, i) => s + i.balance_due, 0);

    // 3. DUE SOON — sent, due within 7 days
    const dueSoon = invoices.filter(i => {
      if (i.status !== 'sent' && i.status !== 'partial') return false;
      if (!i.due_date) return false;
      const due = parseISO(i.due_date);
      return due >= now && due <= weekEnd;
    });
    const dueSoonTotal = dueSoon.reduce((s, i) => s + i.balance_due, 0);

    // 4. OVERDUE
    const overdue = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
    const overdueTotal = overdue.reduce((s, i) => s + i.balance_due, 0);

    // 5. COLLECTED — payments this month
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const collectedPayments = payments.filter(p => {
      const d = parseISO(p.payment_date);
      return d >= monthStart && d <= monthEnd;
    });
    const collectedTotal = collectedPayments.reduce((s, p) => s + p.amount, 0);

    const stages: PipelineStage[] = [
      {
        key: 'completed', label: 'Completed', amount: completedTotal,
        count: completedNotInvoiced.length, countLabel: completedNotInvoiced.length === 1 ? 'shift' : 'shifts',
        topBorderColor: '#1A5C6B',
      },
      {
        key: 'invoiced', label: 'Invoiced', amount: invoicedTotal,
        count: invoicedSent.length, countLabel: invoicedSent.length === 1 ? 'invoice' : 'invoices',
        topBorderColor: '#6AAFBB',
      },
      {
        key: 'due_soon', label: 'Due Soon', amount: dueSoonTotal,
        count: dueSoon.length, countLabel: dueSoon.length === 1 ? 'invoice' : 'invoices',
        subLabel: 'due this week', topBorderColor: '#C9941E',
      },
      {
        key: 'overdue', label: 'Overdue', amount: overdueTotal,
        count: overdue.length, countLabel: overdue.length === 1 ? 'invoice' : 'invoices',
        topBorderColor: '#A07D3E', tintBg: true, tintColor: '#A07D3E',
      },
      {
        key: 'collected', label: 'Collected', amount: collectedTotal,
        count: collectedPayments.length, countLabel: collectedPayments.length === 1 ? 'payment' : 'payments',
        subLabel: 'this month', topBorderColor: '#5EA87A',
      },
    ];

    // To-collect total for top bar = invoiced + due_soon + overdue
    const toCollectTotal = invoicedTotal + dueSoonTotal + overdueTotal;

    return { stages, toCollectTotal };
  }, [shifts, invoices, lineItems, payments, now]);

  // ── This Quarter stats ──
  const quarterStats = useMemo(() => {
    const month = now.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const qStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const qEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);

    const earnings = invoices
      .filter(i => i.paid_at && parseISO(i.paid_at) >= qStart && parseISO(i.paid_at) <= qEnd)
      .reduce((s, i) => s + i.total_amount, 0);

    const shiftsCompleted = shifts.filter(s => {
      const d = parseISO(s.end_datetime);
      return d >= qStart && d <= qEnd && d < now;
    }).length;

    const avg = shiftsCompleted > 0 ? earnings / shiftsCompleted : 0;
    return { quarter, earnings, shiftsCompleted, avg };
  }, [invoices, shifts, now]);

  // ── Attention items (existing logic preserved) ──
  const { credentials: credentialsList } = useCredentials();
  const { getMonthQueue } = useClinicConfirmations();

  const confirmationBreakdown = useMemo(() => {
    const nextMonth = addMonths(now, 1);
    const monthKey = format(nextMonth, 'yyyy-MM');
    const queue = getMonthQueue(monthKey);
    const manualReview = queue.filter(q => !(q.autoSendMonthly || q.autoSendPreshift) && (q.status === 'not_sent' || q.status === 'scheduled')).length;
    const needsUpdate = queue.filter(q => q.status === 'needs_update').length;
    const missingContact = queue.filter(q => !q.contactEmail && (q.monthlyEnabled || q.preshiftEnabled)).length;
    return { manualReview, needsUpdate, missingContact };
  }, [getMonthQueue, now]);

  const summary = useMemo(() => {
    const draftInvoices = invoices.filter(i => i.status === 'draft');
    return { draftInvoices };
  }, [invoices]);

  // Next credential expiring (for briefing line 3)
  const nextCredential = useMemo(() => {
    if (!credentialsList) return { name: null as string | null, days: null as number | null };
    const upcoming = credentialsList
      .filter((c: any) => c.expiration_date)
      .map((c: any) => ({
        name: c.custom_title || 'credential',
        days: differenceInDays(parseISO(c.expiration_date), now),
      }))
      .filter(c => c.days >= 0 && c.days <= 30)
      .sort((a, b) => a.days - b.days);
    return upcoming[0] ?? { name: null, days: null };
  }, [credentialsList, now]);

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
        link: '/schedule', icon: AlertTriangle, urgency: 2, module: 'confirmations',
      });
    }
    if (confirmationBreakdown.missingContact > 0) {
      items.push({
        title: `${confirmationBreakdown.missingContact} facilit${confirmationBreakdown.missingContact > 1 ? 'ies' : 'y'} missing contact`,
        context: 'Add scheduling contact to enable confirmations',
        link: '/schedule', icon: AlertTriangle, urgency: 5, module: 'confirmations',
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
        link: '/credentials?tab=subscriptions', icon: ShieldAlert, urgency: 6, module: 'credentials',
      });
    }

    const nextQuarter = taxQuarters.find(q => new Date(q.due_date) >= now && q.status !== 'paid');
    if (nextQuarter) {
      const daysUntil = differenceInDays(new Date(nextQuarter.due_date), now);
      if (daysUntil <= 30) {
        items.push({
          title: `Q${nextQuarter.quarter} estimated tax due`,
          context: `Due in ${daysUntil} days`,
          link: '/business?tab=tax-strategy&subtab=tracker', icon: DollarSign, urgency: 4, module: 'taxes',
        });
      }
    }

    if (!hasTaxProfile && invoices.some(i => i.paid_at)) {
      items.push({
        title: 'Set up your tax profile',
        context: 'See how much to set aside from each shift',
        link: '/tax-center', icon: Calculator, urgency: 10, module: 'taxes',
      });
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

  // Top nav summary line
  const weekEarnings = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return isWithinInterval(d, { start: weekStart, end: weekEnd }) && new Date(s.end_datetime) < now;
      })
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, now]);

  const topBriefing = useMemo(() => {
    const todayShifts = shifts.filter(s => isToday(parseISO(s.start_datetime)));
    const parts: string[] = [];
    if (todayShifts.length > 0) parts.push(`${todayShifts.length} shift${todayShifts.length > 1 ? 's' : ''} today`);
    if (weekEarnings > 0) parts.push(`$${weekEarnings.toLocaleString()} this week`);
    if (pipeline.toCollectTotal > 0) parts.push(`$${Math.round(pipeline.toCollectTotal).toLocaleString()} to collect`);
    return parts.join(' · ');
  }, [shifts, weekEarnings, pipeline.toCollectTotal]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.14)-theme(spacing.6)-theme(spacing.10))] overflow-auto">
      {/* Welcome banner */}
      {showWelcomeBanner && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mb-2">
          <p className="text-[13px] text-foreground flex-1">
            Welcome to LocumOps, {profile?.first_name || 'there'}! Complete the steps below to set up your workspace — it takes about 5 minutes.
          </p>
          <button type="button" onClick={dismissWelcomeBanner} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top compact greeting bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 shrink-0">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
        <p className="text-[12px] sm:text-[13px] font-medium text-foreground truncate">
          {greeting}, {profile?.first_name || 'there'}{topBriefing ? ` · ${topBriefing}` : ''}
        </p>
      </div>

      {/* Getting Started */}
      {showGettingStarted && (
        <div className="mt-3 shrink-0">
          <GettingStartedChecklist
            onOpenAddClinic={() => setAddClinicOpen(true)}
            onOpenAddShift={() => setAddShiftOpen(true)}
          />
        </div>
      )}

      {!showGettingStarted && (
        <DashboardPromptCards
          credentialCount={credentialsList?.length ?? 0}
          shiftCount={shifts.length}
          hasSentInvoice={invoices.some(i => i.status === 'sent' || i.sent_at)}
          userCreatedAt={user?.created_at}
        />
      )}

      {/* ZONE 1: Briefing + Pipeline */}
      <div className="mt-4 space-y-5">
        <div data-tour="briefing">
          <BriefingBanner
            firstName={profile?.first_name || 'there'}
            shiftCount={briefingData.shiftCount}
            shiftTotal={briefingData.shiftTotal}
            lastMonthShiftCount={briefingData.lastMonthShiftCount}
            lastMonthTotal={briefingData.lastMonthTotal}
            overdueCount={briefingData.overdueCount}
            overdueTotal={briefingData.overdueTotal}
            dueSoonCount={briefingData.dueSoonCount}
            dueSoonTotal={briefingData.dueSoonTotal}
            nextCredentialName={nextCredential.name}
            nextCredentialDays={nextCredential.days}
          />
        </div>

        <div data-tour="pipeline">
          <MoneyPipeline
            stages={pipeline.stages}
            quarter={quarterStats.quarter}
            quarterEarnings={quarterStats.earnings}
            shiftsThisQuarter={quarterStats.shiftsCompleted}
            avgPerShift={quarterStats.avg}
          />
        </div>
      </div>

      {/* ZONE 2: Action Items (only when items exist) */}
      {attentionItems.length > 0 && (
        <div data-tour="attention" className="mt-5">
          <AttentionGroupedList items={attentionItems} />
        </div>
      )}

      {/* Tour */}
      <SpotlightTour steps={TOUR_STEPS} isOpen={tourOpen} onClose={closeTour} />

      <AddFacilityDialog open={addClinicOpen} onOpenChange={setAddClinicOpen} />

      {addShiftOpen && facilities.length > 0 && (
        <ShiftFormDialog
          open={addShiftOpen}
          onOpenChange={setAddShiftOpen}
          facilities={facilities}
          shifts={shifts}
          terms={[]}
          onSave={async (shift) => {
            await addShift(shift);
            setAddShiftOpen(false);
          }}
        />
      )}
    </div>
  );
}
