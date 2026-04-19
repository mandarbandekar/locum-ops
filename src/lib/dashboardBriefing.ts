/**
 * Smart Dashboard Briefing Engine
 *
 * Picks the most relevant briefing message based on the user's current
 * business state. Outputs 2-3 sentences from 3 priority-ordered slots.
 */

import { format } from 'date-fns';

export interface BriefingInput {
  // Identity / empty-state
  firstName: string;
  isBrandNewAccount: boolean; // no shifts AND no invoices AND no credentials

  // Slot 1 — Lead
  overdueCount: number;
  overdueTotal: number;
  oldestOverdueClinicName: string | null;
  daysSinceOldestDue: number | null;
  nextQuarterlyDeadline: Date | null;
  nextQuarterlyQuarter: number | null;
  daysUntilNextQuarterlyDeadline: number | null;
  estimatedQuarterlyTax: number;
  shiftsNext7Count: number;
  uniqueClinicsNext7Count: number;
  projectedWeekEarnings: number;
  nextShiftDate: Date | null;
  nextShiftClinicName: string | null;
  avgMonthlyEarnings: number;
  avgShiftsPerMonth: number;

  // Slot 2 — Money
  collectedThisMonth: number;
  collectedLastMonthAtSamePoint: number;
  dueSoonCount: number;
  dueSoonTotal: number;
  uninvoicedCount: number;
  uninvoicedTotal: number;
  invoicesSentThisQuarterCount: number;
  collectedThisQuarter: number;
  invoicedThisQuarter: number;
  earnedThisQuarter: number;
  shiftsThisQuarter: number;

  // Suppress Slot 1 P2 (quarterly tax) when the dedicated callout card is rendered
  suppressQuarterlyTaxLead?: boolean;

  // Slot 3 — Credential / housekeeping
  urgentCredentialName: string | null;
  urgentCredentialDays: number | null; // <= 14
  upcomingCredentialName: string | null;
  upcomingCredentialDays: number | null; // 15..30
  staleDraftInvoiceCount: number; // drafts older than 3 days
}

export interface BriefingOutput {
  sentences: string[];
  hasUrgentItem: boolean;
}

const fmtCurrency = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtDate = (d: Date) => format(d, 'MMM d');
const fmtDay = (d: Date) => format(d, 'EEEE');

/**
 * Compute the next IRS quarterly estimated tax deadline relative to `now`.
 * Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15 (next year).
 */
export function getNextQuarterlyDeadline(now: Date): { quarter: number; deadline: Date } {
  const y = now.getFullYear();
  const candidates = [
    { quarter: 1, deadline: new Date(y, 3, 15) },
    { quarter: 2, deadline: new Date(y, 5, 15) },
    { quarter: 3, deadline: new Date(y, 8, 15) },
    { quarter: 4, deadline: new Date(y + 1, 0, 15) },
    // include prior-year Q4 in case we're in early Jan
    { quarter: 4, deadline: new Date(y, 0, 15) },
  ];
  const future = candidates
    .filter(c => c.deadline >= now)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  return future[0];
}

export function generateDashboardBriefing(d: BriefingInput): BriefingOutput {
  // Empty state
  if (d.isBrandNewAccount) {
    return {
      sentences: [
        `Welcome to Locum Ops! Start by adding a clinic and logging your first shift — I'll begin tracking your earnings and building your business picture from there.`,
      ],
      hasUrgentItem: false,
    };
  }

  let hasUrgent = false;
  const sentences: string[] = [];

  // ── SLOT 1: The Lead ──
  if (d.overdueCount > 0 && d.overdueTotal > 0) {
    hasUrgent = true;
    const oldest = d.oldestOverdueClinicName ?? 'a client';
    const days = d.daysSinceOldestDue ?? 0;
    sentences.push(
      `${d.overdueCount} invoice${d.overdueCount === 1 ? '' : 's'} totaling ${fmtCurrency(d.overdueTotal)} ${d.overdueCount === 1 ? 'is' : 'are'} overdue. The oldest is from ${oldest}, ${days} day${days === 1 ? '' : 's'} past due.`
    );
  } else if (
    !d.suppressQuarterlyTaxLead &&
    d.nextQuarterlyDeadline &&
    d.daysUntilNextQuarterlyDeadline !== null &&
    d.daysUntilNextQuarterlyDeadline >= 0 &&
    d.daysUntilNextQuarterlyDeadline <= 21
  ) {
    sentences.push(
      `Your Q${d.nextQuarterlyQuarter} estimated tax payment is due ${fmtDate(d.nextQuarterlyDeadline)}. Based on your earnings so far, consider setting aside approximately ${fmtCurrency(d.estimatedQuarterlyTax)} — check your Tax Strategy page for the full breakdown.`
    );
  } else if (d.shiftsNext7Count >= 3) {
    sentences.push(
      `Busy week ahead — ${d.shiftsNext7Count} shifts across ${d.uniqueClinicsNext7Count} clinic${d.uniqueClinicsNext7Count === 1 ? '' : 's'} worth ${fmtCurrency(d.projectedWeekEarnings)}.`
    );
  } else if (d.shiftsNext7Count >= 1 && d.nextShiftDate && d.nextShiftClinicName) {
    sentences.push(
      `You have ${d.shiftsNext7Count} shift${d.shiftsNext7Count === 1 ? '' : 's'} this week worth ${fmtCurrency(d.projectedWeekEarnings)}, starting ${fmtDay(d.nextShiftDate)} at ${d.nextShiftClinicName}.`
    );
  } else {
    sentences.push(
      `No shifts booked this week. You averaged ${fmtCurrency(d.avgMonthlyEarnings)} per month over the last 3 months across ${Math.round(d.avgShiftsPerMonth)} shift${Math.round(d.avgShiftsPerMonth) === 1 ? '' : 's'}.`
    );
  }

  // ── SLOT 2: Money Context ──
  if (
    d.collectedThisMonth > 0 &&
    d.collectedThisMonth > d.collectedLastMonthAtSamePoint
  ) {
    const diff = d.collectedThisMonth - d.collectedLastMonthAtSamePoint;
    sentences.push(
      `You've collected ${fmtCurrency(d.collectedThisMonth)} so far this month — ahead of last month's pace by ${fmtCurrency(diff)}.`
    );
  } else if (d.dueSoonCount > 0) {
    sentences.push(
      `${d.dueSoonCount} invoice${d.dueSoonCount === 1 ? '' : 's'} worth ${fmtCurrency(d.dueSoonTotal)} ${d.dueSoonCount === 1 ? 'is' : 'are'} due this week.`
    );
  } else if (d.uninvoicedCount > 0) {
    sentences.push(
      `You have ${d.uninvoicedCount} completed shift${d.uninvoicedCount === 1 ? '' : 's'} worth ${fmtCurrency(d.uninvoicedTotal)} that haven't been invoiced yet.`
    );
  } else if (d.invoicesSentThisQuarterCount > 3 && d.invoicedThisQuarter > 0) {
    const rate = Math.round((d.collectedThisQuarter / d.invoicedThisQuarter) * 100);
    sentences.push(
      `Your collection rate this quarter is ${rate}% — ${fmtCurrency(d.collectedThisQuarter)} collected out of ${fmtCurrency(d.invoicedThisQuarter)} invoiced.`
    );
  } else {
    sentences.push(
      `You've earned ${fmtCurrency(d.earnedThisQuarter)} this quarter across ${d.shiftsThisQuarter} shift${d.shiftsThisQuarter === 1 ? '' : 's'}.`
    );
  }

  // ── SLOT 3: Credential / Housekeeping (optional) ──
  if (d.urgentCredentialName && d.urgentCredentialDays !== null && d.urgentCredentialDays <= 14) {
    hasUrgent = true;
    sentences.push(
      `Urgent: your ${d.urgentCredentialName} expires in ${d.urgentCredentialDays} day${d.urgentCredentialDays === 1 ? '' : 's'}.`
    );
  } else if (
    d.upcomingCredentialName &&
    d.upcomingCredentialDays !== null &&
    d.upcomingCredentialDays <= 30
  ) {
    sentences.push(
      `Your ${d.upcomingCredentialName} is due for renewal in ${d.upcomingCredentialDays} day${d.upcomingCredentialDays === 1 ? '' : 's'}.`
    );
  } else if (d.staleDraftInvoiceCount > 0) {
    sentences.push(
      `You have ${d.staleDraftInvoiceCount} draft invoice${d.staleDraftInvoiceCount === 1 ? '' : 's'} ready to review and send.`
    );
  }

  return { sentences, hasUrgentItem: hasUrgent };
}
