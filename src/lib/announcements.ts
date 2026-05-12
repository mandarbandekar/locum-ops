/**
 * Announcement registry — single source of truth for "what's new" entries.
 *
 * Adding a new feature announcement = append one entry below. No new banner
 * components, no per-feature dismissal flags, no dashboard edits required.
 *
 * Two surfaces consume this registry:
 *   1. <WhatsNewButton /> in the header — lists all visible entries.
 *   2. <HighlightBanner /> on the dashboard — renders at most ONE entry
 *      that is marked `priority: 'highlight'`.
 *
 * Read/dismiss state is stored on `profile.dismissed_prompts` under the
 * key `announcement:<id>` (a boolean). This piggybacks on the existing
 * column so no migration is needed.
 */

import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Tag, Zap } from 'lucide-react';
import type { UserProfile } from '@/contexts/UserProfileContext';
import type { Shift, Facility } from '@/types';

export interface AnnouncementContext {
  profile: UserProfile | null;
  shifts: Shift[];
  facilities: Facility[];
  untypedShiftCount: number;
  /** ISO timestamp string of the auth user's creation time, if known. */
  userCreatedAt?: string | null;
}

export type AnnouncementAudience = 'all' | ((ctx: AnnouncementContext) => boolean);

export interface AnnouncementCta {
  label: string;
  /** Internal route, passed to react-router navigate(). */
  to: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** ISO date (YYYY-MM-DD). Used for sort order, newest first. */
  publishedAt: string;
  audience: AnnouncementAudience;
  cta?: AnnouncementCta;
  icon?: LucideIcon;
  /**
   * 'highlight' entries may render in the inline dashboard slot. At most
   * ONE highlight is shown at a time. Order: highest priority first
   * (registry order), then newest publishedAt.
   */
  priority?: 'highlight' | 'normal';
  /** Optional auto-expiry. After N days from publishedAt, hidden everywhere. */
  expiresAfterDays?: number;
}

export const ANNOUNCEMENT_DISMISS_PREFIX = 'announcement:';
export const ANNOUNCEMENT_HIDE_PREFIX = 'announcement-hidden:';

/**
 * Registry — newest entries at the top.
 * Audience predicates are evaluated with the live context object.
 */
export const announcements: Announcement[] = [
  {
    id: 'shift-types-2026-05',
    title: 'Categorize your rates',
    body: "Tag each rate with a shift type (GP, ER, Surgery…) so it shows up across your schedule and invoices. We've pre-filled suggestions where we could.",
    publishedAt: '2026-05-01',
    icon: Tag,
    cta: { label: 'Review & save', to: '/settings/rate-card' },
    priority: 'highlight',
    audience: ctx => ctx.untypedShiftCount > 0,
  },
  {
    id: 'platform-shifts-2026-04',
    title: 'Track platform shifts',
    body: "Log shifts from platforms like Roo and IndeVets alongside your direct relief work. Your existing facilities are marked as Direct — update any facility if you also work with it through a platform.",
    publishedAt: '2026-04-25',
    icon: Zap,
    cta: { label: 'Update a facility', to: '/facilities' },
    audience: ctx => ctx.facilities.length > 0 && isExistingUser(ctx.userCreatedAt, '2026-04-25'),
  },
  {
    id: 'feedback-button-2026-04',
    title: "Got feedback? We're listening.",
    body: "You can now send bugs, ideas, or confusion straight from the app — look for the Feedback button in the top right.",
    publishedAt: '2026-04-20',
    icon: MessageCircle,
    expiresAfterDays: 60,
    audience: 'all',
  },
];

function isExistingUser(userCreatedAt: string | null | undefined, beforeIso: string): boolean {
  if (!userCreatedAt) return false;
  return new Date(userCreatedAt) < new Date(beforeIso);
}

export function isAnnouncementDismissed(profile: UserProfile | null, id: string): boolean {
  if (!profile) return false;
  return !!profile.dismissed_prompts?.[`${ANNOUNCEMENT_DISMISS_PREFIX}${id}`];
}

export function isAnnouncementHidden(profile: UserProfile | null, id: string): boolean {
  if (!profile) return false;
  return !!profile.dismissed_prompts?.[`${ANNOUNCEMENT_HIDE_PREFIX}${id}`];
}

export function isAnnouncementExpired(a: Announcement, now: Date = new Date()): boolean {
  if (!a.expiresAfterDays) return false;
  const published = new Date(a.publishedAt).getTime();
  const expiry = published + a.expiresAfterDays * 24 * 60 * 60 * 1000;
  return now.getTime() > expiry;
}

function audienceMatches(a: Announcement, ctx: AnnouncementContext): boolean {
  if (a.audience === 'all') return true;
  try {
    return a.audience(ctx);
  } catch {
    return false;
  }
}

/** All visible (audience-matched, not expired) announcements, sorted newest first. */
export function getVisibleAnnouncements(ctx: AnnouncementContext, now: Date = new Date()): Announcement[] {
  return announcements
    .filter(a => !isAnnouncementExpired(a, now))
    .filter(a => !isAnnouncementHidden(ctx.profile, a.id))
    .filter(a => audienceMatches(a, ctx))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Visible + not yet seen by this user. Used for the unread count badge. */
export function getUnreadAnnouncements(ctx: AnnouncementContext, now: Date = new Date()): Announcement[] {
  return getVisibleAnnouncements(ctx, now).filter(a => !isAnnouncementDismissed(ctx.profile, a.id));
}

/**
 * The single highlight entry to render inline on the dashboard, if any.
 * Rules: visible + not dismissed + priority === 'highlight'. First match wins
 * (registry order acts as priority).
 */
export function getActiveHighlight(ctx: AnnouncementContext, now: Date = new Date()): Announcement | null {
  const candidates = announcements
    .filter(a => a.priority === 'highlight')
    .filter(a => !isAnnouncementExpired(a, now))
    .filter(a => audienceMatches(a, ctx))
    .filter(a => !isAnnouncementDismissed(ctx.profile, a.id));
  return candidates[0] ?? null;
}
