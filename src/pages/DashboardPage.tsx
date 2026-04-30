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
import { generateCredentialReminders, generateUninvoicedShiftReminders, generateQuarterlyTaxAttentionReminders, generateAnnualTaxAttentionReminders } from '@/lib/reminderEngine';
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
import { UpcomingShiftsStrip, UpcomingShiftItem } from '@/components/dashboard/UpcomingShiftsStrip';
import { EmptyDashboardPrompt } from '@/components/dashboard/EmptyDashboardPrompt';
import { QuarterlyTaxCallout } from '@/components/dashboard/QuarterlyTaxCallout';
import { FirstTimeDashboard } from '@/components/dashboard/FirstTimeDashboard';
import { OnboardingHandoffBanner } from '@/components/dashboard/OnboardingHandoffBanner';
import { ShiftTypeMigrationBanner } from '@/components/dashboard/ShiftTypeMigrationBanner';
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

  // First-run handoff: completed onboarding via business map, not yet dismissed
  const showOnboardingHandoff =
    !!profile?.onboarding_completed_at &&
    !!profile?.onboarding_progress?.business_map_seen &&
    !profile?.dismissed_prompts?.onboarding_handoff;
  const onboardingProgress = profile?.onboarding_progress;
  const handoffInvoiceCount = useMemo(() => {
    const ids = onboardingProgress?.session_shift_ids ?? [];
    if (ids.length === 0) return 0;
    const set = new Set(ids);
    return invoices.filter(inv =>
      lineItems.some(li => li.invoice_id === inv.id && li.shift_id && set.has(li.shift_id))
    ).length;
  }, [invoices, lineItems, onboardingProgress?.session_shift_ids]);
  const dismissOnboardingHandoff = useCallback(async () => {
    await updateProfile({
      dismissed_prompts: { ...profile?.dismissed_prompts, onboarding_handoff: true },
    });
  }, [profile, updateProfile]);

  const dismissWelcomeBanner = useCallback(async () => {
    await updateProfile({
      dismissed_prompts: { ...profile?.dismissed_prompts, welcome_banner: true },
    });
  }, [profile, updateProfile]);

  // Engagement-type announcement banner — show once to pre-existing users with at least one facility
  const showEngagementAnnouncement = useMemo(() => {
    if (isDemo || !profile || !user?.created_at) return false;
    if (profile.engagement_announcement_dismissed_at) return false;
    if (facilities.length === 0) return false;
    const createdAt = parseISO(user.created_at);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return createdAt < startOfToday;
  }, [isDemo, profile, user?.created_at, facilities.length, now]);

  const dismissEngagementAnnouncement = useCallback(async () => {
    await updateProfile({ engagement_announcement_dismissed_at: new Date().toISOString() });
  }, [updateProfile]);

  const showGettingStarted = !profile?.dismissed_prompts?.getting_started && (facilities.length === 0 || shifts.length === 0);

  // Migration nudge: how many existing shifts have no shift_type yet?
  const untypedShiftCount = useMemo(() => {
    if (isDemo) return 0;
    return shifts.filter(s => !s.shift_type).length;
  }, [isDemo, shifts]);

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
  const [hasCalendarSync, setHasCalendarSync] = useState(false);

  useEffect(() => {
    if (isDemo || !user) return;
    Promise.all([
      dashDb('tax_quarter_statuses').select('quarter,due_date,status').eq('tax_year', now.getFullYear()).order('quarter'),
      dashDb('required_subscriptions').select('name,renewal_date,status,archived_at').is('archived_at', null),
      dashDb('calendar_connections').select('id,status').eq('user_id', user.id).eq('status', 'active').limit(1),
    ]).then(([qsRes, subRes, calRes]) => {
      if (qsRes.data) setTaxQuarters(qsRes.data as any[]);
      if (subRes.data) setSubscriptions(subRes.data as any[]);
      if (calRes.data) setHasCalendarSync((calRes.data as any[]).length > 0);
    });
  }, [user?.id, isDemo]);

  const getFacilityName = (id: string) => facilities.find(c => c.id === id)?.name || 'Unknown';

  // ── Briefing data (Slot 1 + 2 inputs computed here; credential inputs added below) ──
  const briefingShared = useMemo(() => {
    const weekEnd = addDays(now, 7);

    // Upcoming shifts (next 7 days, not started)
    const upcomingShifts = shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return d >= now && d <= weekEnd;
      })
      .sort((a, b) => parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime());
    const projectedWeekEarnings = upcomingShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    const uniqueClinicsNext7 = new Set(upcomingShifts.map(s => s.facility_id)).size;
    const nextShift = upcomingShifts[0] ?? null;

    // 3-month rolling average
    const threeMonthsAgo = startOfMonth(subMonths(now, 3));
    const recentShifts = shifts.filter(s => {
      const d = parseISO(s.end_datetime);
      return d >= threeMonthsAgo && d < now;
    });
    const recentEarnings = recentShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);
    const avgMonthlyEarnings = recentEarnings / 3;
    const avgShiftsPerMonth = recentShifts.length / 3;

    // Overdue
    const overdueInvs = invoices.filter(i => computeInvoiceStatus(i) === 'overdue');
    const overdueTotal = overdueInvs.reduce((s, i) => s + i.balance_due, 0);
    const oldestOverdue = [...overdueInvs]
      .filter(i => i.due_date)
      .sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime())[0];
    const oldestOverdueClinicName = oldestOverdue ? getFacilityName(oldestOverdue.facility_id) : null;
    const daysSinceOldestDue = oldestOverdue?.due_date
      ? differenceInDays(now, parseISO(oldestOverdue.due_date))
      : null;

    // Due soon (next 7 days)
    const dueSoonInvs = invoices.filter(i => {
      const status = computeInvoiceStatus(i);
      if (status !== 'sent' && status !== 'partial') return false;
      if (!i.due_date) return false;
      const due = parseISO(i.due_date);
      return due >= now && due <= weekEnd;
    });
    const dueSoonTotal = dueSoonInvs.reduce((s, i) => s + i.balance_due, 0);

    // Uninvoiced completed shifts
    const invoicedShiftIds = new Set(lineItems.filter(li => li.shift_id).map(li => li.shift_id!));
    const uninvoicedShifts = shifts.filter(s => parseISO(s.end_datetime) < now && !invoicedShiftIds.has(s.id));
    const uninvoicedTotal = uninvoicedShifts.reduce((sum, s) => sum + (s.rate_applied || 0), 0);

    // Collected this month vs last month at same point (day-of-month)
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const collectedThisMonth = payments
      .filter(p => {
        const d = parseISO(p.payment_date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, p) => s + p.amount, 0);

    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const sameDayLastMonthCutoff = addDays(lastMonthStart, now.getDate() - 1);
    const collectedLastMonthAtSamePoint = payments
      .filter(p => {
        const d = parseISO(p.payment_date);
        return d >= lastMonthStart && d <= sameDayLastMonthCutoff;
      })
      .reduce((s, p) => s + p.amount, 0);

    // Quarter scope
    const month = now.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const qStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const qEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);

    const invoicesSentThisQuarter = invoices.filter(i => {
      if (!i.sent_at) return false;
      const d = parseISO(i.sent_at);
      return d >= qStart && d <= qEnd;
    });
    const invoicedThisQuarter = invoicesSentThisQuarter.reduce((s, i) => s + i.total_amount, 0);
    const collectedThisQuarter = invoices
      .filter(i => i.paid_at && parseISO(i.paid_at) >= qStart && parseISO(i.paid_at) <= qEnd)
      .reduce((s, i) => s + i.total_amount, 0);
    const earnedThisQuarter = collectedThisQuarter; // earned = paid in quarter
    const shiftsThisQuarterCount = shifts.filter(s => {
      const d = parseISO(s.end_datetime);
      return d >= qStart && d <= qEnd && d < now;
    }).length;

    // Next quarterly tax deadline
    const { quarter: nextTaxQ, deadline: nextTaxDeadline } = getNextQuarterlyDeadline(now);
    const daysUntilNextTax = differenceInDays(nextTaxDeadline, now);

    // Estimated quarterly tax — prefer DB value for that quarter, else 25% of this-quarter earnings
    const dbQuarter = taxQuarters.find(q => q.quarter === nextTaxQ && q.status !== 'paid');
    const estimatedQuarterlyTax = dbQuarter
      ? Math.round(earnedThisQuarter * 0.25) // fallback heuristic — DB row exists but no amount field
      : Math.round(earnedThisQuarter * 0.25);

    // Stale draft invoices (>3 days old)
    const staleDraftCount = invoices.filter(i => {
      if (i.status !== 'draft') return false;
      // use invoice_date or created_at proxy
      const ref = i.invoice_date ? parseISO(i.invoice_date) : null;
      if (!ref) return false;
      return differenceInDays(now, ref) > 3;
    }).length;

    return {
      shiftsNext7Count: upcomingShifts.length,
      uniqueClinicsNext7Count: uniqueClinicsNext7,
      projectedWeekEarnings,
      nextShiftDate: nextShift ? parseISO(nextShift.start_datetime) : null,
      nextShiftClinicName: nextShift ? getFacilityName(nextShift.facility_id) : null,
      avgMonthlyEarnings,
      avgShiftsPerMonth,
      overdueCount: overdueInvs.length,
      overdueTotal,
      oldestOverdueClinicName,
      daysSinceOldestDue,
      dueSoonCount: dueSoonInvs.length,
      dueSoonTotal,
      uninvoicedCount: uninvoicedShifts.length,
      uninvoicedTotal,
      collectedThisMonth,
      collectedLastMonthAtSamePoint,
      invoicesSentThisQuarterCount: invoicesSentThisQuarter.length,
      invoicedThisQuarter,
      collectedThisQuarter,
      earnedThisQuarter,
      shiftsThisQuarterCount,
      nextTaxQuarter: nextTaxQ,
      nextTaxDeadline,
      daysUntilNextTax,
      estimatedQuarterlyTax,
      staleDraftCount,
    };
  }, [shifts, invoices, lineItems, payments, facilities, taxQuarters, now]);

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

  // ── First-time dashboard experience gating ──
  // Show first-time layout when: real user (not demo), has 1+ clinic, has 1+ shift, fewer than 5 shifts,
  // and intro hasn't been dismissed.
  const showFirstTimeDashboard =
    !isDemo &&
    !!profile &&
    !profile.dashboard_intro_dismissed &&
    facilities.length >= 1 &&
    shifts.length >= 1 &&
    shifts.length < 5;

  // Show one-time level-up banner when user crosses the 5-shift threshold for the first time.
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  useEffect(() => {
    if (isDemo || !profile) return;
    if (
      shifts.length >= 5 &&
      !profile.dashboard_intro_dismissed &&
      !profile.dashboard_levelup_shown
    ) {
      setLevelUpVisible(true);
      // Persist both flags so the banner only ever shows once.
      updateProfile({ dashboard_intro_dismissed: true, dashboard_levelup_shown: true });
      const t = setTimeout(() => setLevelUpVisible(false), 10000);
      return () => clearTimeout(t);
    }
  }, [shifts.length, isDemo, profile?.dashboard_intro_dismissed, profile?.dashboard_levelup_shown]);

  const dismissIntro = useCallback(() => {
    if (profile && !profile.dashboard_intro_dismissed) {
      updateProfile({ dashboard_intro_dismissed: true });
    }
  }, [profile, updateProfile]);

  // Estimated quarterly tax + per-shift set-aside for the first-time tax variant
  const projectedQuarterEarnings = useMemo(() => {
    const month = now.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const qStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const qEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);
    return shifts
      .filter(s => {
        const d = parseISO(s.start_datetime);
        return d >= qStart && d <= qEnd;
      })
      .reduce((sum, s) => sum + (s.rate_applied || 0), 0);
  }, [shifts, now]);

  const perShiftSetAside = useMemo(() => {
    if (shifts.length === 0) return 0;
    const totalEarnings = shifts.reduce((s, sh) => s + (sh.rate_applied || 0), 0);
    return Math.round((totalEarnings * 0.25) / shifts.length);
  }, [shifts]);

  // ── Upcoming shifts strip (next 5 by date asc, future only) ──
  const upcomingShiftsForStrip = useMemo<UpcomingShiftItem[]>(() => {
    return shifts
      .filter(s => parseISO(s.start_datetime) >= now)
      .sort((a, b) => parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        date: parseISO(s.start_datetime),
        clinicName: getFacilityName(s.facility_id),
        startTime: format(parseISO(s.start_datetime), 'h:mm a'),
        endTime: format(parseISO(s.end_datetime), 'h:mm a'),
      }));
  }, [shifts, facilities, now]);

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

  // Credential buckets for briefing Slot 3
  const credentialBuckets = useMemo(() => {
    const empty = {
      urgentName: null as string | null, urgentDays: null as number | null,
      upcomingName: null as string | null, upcomingDays: null as number | null,
    };
    if (!credentialsList) return empty;
    const sorted = credentialsList
      .filter((c: any) => c.expiration_date)
      .map((c: any) => ({
        name: c.custom_title || 'credential',
        days: differenceInDays(parseISO(c.expiration_date), now),
      }))
      .filter(c => c.days >= 0)
      .sort((a, b) => a.days - b.days);
    const urgent = sorted.find(c => c.days <= 14);
    const upcoming = sorted.find(c => c.days > 14 && c.days <= 30);
    return {
      urgentName: urgent?.name ?? null,
      urgentDays: urgent?.days ?? null,
      upcomingName: upcoming?.name ?? null,
      upcomingDays: upcoming?.days ?? null,
    };
  }, [credentialsList, now]);

  // Show the quarterly tax callout card during the 30-day pre-deadline window
  // (or up to 7 days past due). When visible, suppress the briefing's P2 lead.
  const showTaxCallout = useMemo(() => {
    const d = briefingShared.daysUntilNextTax;
    return d <= 30 && d >= -7;
  }, [briefingShared.daysUntilNextTax]);

  // Final briefing output
  const briefing = useMemo(() => {
    const isBrandNewAccount =
      shifts.length === 0 && invoices.length === 0 && (credentialsList?.length ?? 0) === 0;
    const input: BriefingInput = {
      firstName: profile?.first_name || 'there',
      isBrandNewAccount,
      overdueCount: briefingShared.overdueCount,
      overdueTotal: briefingShared.overdueTotal,
      oldestOverdueClinicName: briefingShared.oldestOverdueClinicName,
      daysSinceOldestDue: briefingShared.daysSinceOldestDue,
      nextQuarterlyDeadline: briefingShared.nextTaxDeadline,
      nextQuarterlyQuarter: briefingShared.nextTaxQuarter,
      daysUntilNextQuarterlyDeadline: briefingShared.daysUntilNextTax,
      estimatedQuarterlyTax: briefingShared.estimatedQuarterlyTax,
      suppressQuarterlyTaxLead: showTaxCallout,
      shiftsNext7Count: briefingShared.shiftsNext7Count,
      uniqueClinicsNext7Count: briefingShared.uniqueClinicsNext7Count,
      projectedWeekEarnings: briefingShared.projectedWeekEarnings,
      nextShiftDate: briefingShared.nextShiftDate,
      nextShiftClinicName: briefingShared.nextShiftClinicName,
      avgMonthlyEarnings: briefingShared.avgMonthlyEarnings,
      avgShiftsPerMonth: briefingShared.avgShiftsPerMonth,
      collectedThisMonth: briefingShared.collectedThisMonth,
      collectedLastMonthAtSamePoint: briefingShared.collectedLastMonthAtSamePoint,
      dueSoonCount: briefingShared.dueSoonCount,
      dueSoonTotal: briefingShared.dueSoonTotal,
      uninvoicedCount: briefingShared.uninvoicedCount,
      uninvoicedTotal: briefingShared.uninvoicedTotal,
      invoicesSentThisQuarterCount: briefingShared.invoicesSentThisQuarterCount,
      collectedThisQuarter: briefingShared.collectedThisQuarter,
      invoicedThisQuarter: briefingShared.invoicedThisQuarter,
      earnedThisQuarter: briefingShared.earnedThisQuarter,
      shiftsThisQuarter: briefingShared.shiftsThisQuarterCount,
      urgentCredentialName: credentialBuckets.urgentName,
      urgentCredentialDays: credentialBuckets.urgentDays,
      upcomingCredentialName: credentialBuckets.upcomingName,
      upcomingCredentialDays: credentialBuckets.upcomingDays,
      staleDraftInvoiceCount: briefingShared.staleDraftCount,
    };
    return generateDashboardBriefing(input);
  }, [briefingShared, credentialBuckets, profile?.first_name, shifts.length, invoices.length, credentialsList?.length, showTaxCallout]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    // Draft invoices intentionally excluded from "Needs your attention"

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

    // Monthly clinic confirmations removed from "Needs Your Attention".

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

    // Credential renewals — surface anything within 60 days of expiry, plus
    // anything already expired but not yet renewed.
    if (credentialsList) {
      generateCredentialReminders(credentialsList, now, 60).forEach(r => {
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

    // Quarterly estimated tax deadlines (within 45 days). Skip any quarter the
    // user has already marked paid in their tax tracker.
    const paidQuarters = new Set(
      taxQuarters.filter(q => q.status === 'paid').map(q => `Q${q.quarter}`),
    );
    generateQuarterlyTaxAttentionReminders(now, 45).forEach(r => {
      const qMatch = r.title.match(/Q[1-4]/);
      if (qMatch && paidQuarters.has(qMatch[0])) return;
      items.push({
        title: r.title, context: r.body, link: r.link,
        icon: DollarSign, urgency: r.urgency, module: 'taxes',
      });
    });

    // Annual federal filing deadline (April 15) within 60 days.
    generateAnnualTaxAttentionReminders(now, 60).forEach(r => {
      items.push({
        title: r.title, context: r.body, link: r.link,
        icon: Calculator, urgency: r.urgency, module: 'taxes',
      });
    });

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
    <div className="flex flex-col min-h-full">
      {/* Shift Type migration nudge (one-time, pre-existing users with untyped shifts) — top priority */}
      <ShiftTypeMigrationBanner
        untypedShiftCount={untypedShiftCount}
        shifts={shifts}
        facilities={facilities}
      />

      {/* First-run onboarding handoff banner */}
      {showOnboardingHandoff && (
        <div className="shrink-0 mb-3">
          <OnboardingHandoffBanner
            firstName={profile?.first_name || ''}
            facilitiesCount={facilities.length}
            shiftsCount={shifts.length}
            invoiceReadyCount={handoffInvoiceCount}
            onDismiss={dismissOnboardingHandoff}
          />
        </div>
      )}

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

      {/* Engagement-type announcement (one-time, pre-existing users with facilities) */}
      {showEngagementAnnouncement && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mb-2">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground mb-0.5">
              New: track platform shifts
            </p>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              You can now log shifts from platforms like Roo and IndeVets alongside your direct relief work. Your existing facilities are marked as Direct — update any facility if you also work with it through a platform.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => navigate('/facilities')}
                className="text-[12px] font-semibold text-primary hover:underline"
              >
                Update a facility →
              </button>
              <button
                type="button"
                onClick={dismissEngagementAnnouncement}
                className="text-[12px] text-muted-foreground hover:text-foreground ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissEngagementAnnouncement}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


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

      {/* Level-up banner (one-time) */}
      {levelUpVisible && (
        <div className="mt-3 relative bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: '#1A5C6B' }} />
          <div className="flex items-center gap-3 px-4 py-3 pl-5">
            <p className="text-[14px] text-foreground flex-1">
              Your dashboard has leveled up! With {shifts.length} shifts logged, you now have a full business view.
            </p>
            <button type="button" onClick={() => setLevelUpVisible(false)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ZONE 1: Empty state OR First-time experience OR Standard layout */}
      {facilities.length === 0 && shifts.length === 0 ? (
        <div className="mt-4 animate-in fade-in duration-200">
          <EmptyDashboardPrompt onAddClinic={() => setAddClinicOpen(true)} />
        </div>
      ) : showFirstTimeDashboard ? (
        <div className="mt-4">
          <FirstTimeDashboard
            firstName={profile?.first_name || 'there'}
            shifts={shifts}
            facilities={facilities}
            invoices={invoices}
            pipelineStages={pipeline.stages}
            quarter={quarterStats.quarter}
            quarterEarnings={quarterStats.earnings}
            shiftsThisQuarter={quarterStats.shiftsCompleted}
            avgPerShift={quarterStats.avg}
            hasTaxProfile={hasTaxProfile}
            hasCredentials={(credentialsList?.length ?? 0) > 0}
            hasCalendarSync={hasCalendarSync}
            estimatedQuarterlyTax={briefingShared.estimatedQuarterlyTax}
            perShiftSetAside={perShiftSetAside}
            projectedQuarterEarnings={projectedQuarterEarnings}
            onSkip={dismissIntro}
            onStageClick={(key) => {
              if (key === 'completed') navigate('/schedule?filter=completed');
              else if (key === 'invoiced') navigate('/invoices?filter=sent');
              else if (key === 'due_soon') navigate('/invoices?filter=due_soon');
              else if (key === 'overdue') navigate('/invoices?filter=overdue');
              else if (key === 'collected') navigate('/invoices?filter=paid_this_month');
            }}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5 animate-in fade-in duration-200">
          <div data-tour="briefing">
            <BriefingBanner
              greeting={`${greeting}, ${profile?.first_name || 'there'}`}
              sentences={briefing.sentences}
              hasUrgentItem={briefing.hasUrgentItem}
            />
          </div>

          <div data-tour="pipeline">
            <MoneyPipeline
              stages={pipeline.stages}
              quarter={quarterStats.quarter}
              quarterEarnings={quarterStats.earnings}
              shiftsThisQuarter={quarterStats.shiftsCompleted}
              avgPerShift={quarterStats.avg}
              onStageClick={(key) => {
                if (key === 'completed') navigate('/schedule?filter=completed');
                else if (key === 'invoiced') navigate('/invoices?filter=sent');
                else if (key === 'due_soon') navigate('/invoices?filter=due_soon');
                else if (key === 'overdue') navigate('/invoices?filter=overdue');
                else if (key === 'collected') navigate('/invoices?filter=paid_this_month');
              }}
            />
          </div>

          {showTaxCallout && (
            <QuarterlyTaxCallout
              quarter={briefingShared.nextTaxQuarter}
              deadline={briefingShared.nextTaxDeadline}
              daysUntilDeadline={briefingShared.daysUntilNextTax}
              quarterEarnings={briefingShared.earnedThisQuarter}
              estimatedTax={briefingShared.estimatedQuarterlyTax}
              hasTaxProfile={hasTaxProfile}
            />
          )}

          <UpcomingShiftsStrip shifts={upcomingShiftsForStrip} />
        </div>
      )}

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
