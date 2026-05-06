import { describe, it, expect } from 'vitest';
import {
  announcements,
  getVisibleAnnouncements,
  getUnreadAnnouncements,
  getActiveHighlight,
  isAnnouncementExpired,
  ANNOUNCEMENT_DISMISS_PREFIX,
  type AnnouncementContext,
} from '@/lib/announcements';
import type { UserProfile } from '@/contexts/UserProfileContext';

function makeProfile(dismissed: Record<string, boolean> = {}): UserProfile {
  return { dismissed_prompts: dismissed } as unknown as UserProfile;
}

function makeCtx(overrides: Partial<AnnouncementContext> = {}): AnnouncementContext {
  return {
    profile: makeProfile(),
    shifts: [],
    facilities: [],
    untypedShiftCount: 0,
    userCreatedAt: '2020-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('announcements registry', () => {
  it('all entries have unique ids', () => {
    const ids = announcements.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns visible items sorted newest first', () => {
    const ctx = makeCtx({
      facilities: [{} as any],
      untypedShiftCount: 5,
    });
    const visible = getVisibleAnnouncements(ctx, new Date('2026-05-02'));
    const dates = visible.map(a => a.publishedAt);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it('audience predicate filters out non-matching entries', () => {
    const ctx = makeCtx({ untypedShiftCount: 0, facilities: [] });
    const visible = getVisibleAnnouncements(ctx, new Date('2026-05-02'));
    expect(visible.find(a => a.id === 'shift-types-2026-05')).toBeUndefined();
    expect(visible.find(a => a.id === 'platform-shifts-2026-04')).toBeUndefined();
  });

  it('expired announcements are hidden', () => {
    const ctx = makeCtx();
    // feedback-button-2026-04 expires after 60 days
    const visibleNow = getVisibleAnnouncements(ctx, new Date('2026-04-25'));
    const visibleLater = getVisibleAnnouncements(ctx, new Date('2026-09-01'));
    expect(visibleNow.find(a => a.id === 'feedback-button-2026-04')).toBeTruthy();
    expect(visibleLater.find(a => a.id === 'feedback-button-2026-04')).toBeUndefined();

    expect(
      isAnnouncementExpired(
        { id: 'x', title: '', body: '', publishedAt: '2026-01-01', audience: 'all', expiresAfterDays: 30 },
        new Date('2026-03-01'),
      ),
    ).toBe(true);
  });

  it('unread filter respects dismissed_prompts', () => {
    const ctx = makeCtx({
      facilities: [{} as any],
      untypedShiftCount: 5,
      profile: makeProfile({
        [`${ANNOUNCEMENT_DISMISS_PREFIX}shift-types-2026-05`]: true,
      }),
    });
    const unread = getUnreadAnnouncements(ctx, new Date('2026-05-02'));
    expect(unread.find(a => a.id === 'shift-types-2026-05')).toBeUndefined();
  });

  it('highlight slot returns at most one entry, and only when matched + unread', () => {
    const ctx = makeCtx({ untypedShiftCount: 3 });
    const hi = getActiveHighlight(ctx, new Date('2026-05-02'));
    expect(hi?.id).toBe('shift-types-2026-05');

    const dismissedCtx = makeCtx({
      untypedShiftCount: 3,
      profile: makeProfile({
        [`${ANNOUNCEMENT_DISMISS_PREFIX}shift-types-2026-05`]: true,
      }),
    });
    expect(getActiveHighlight(dismissedCtx, new Date('2026-05-02'))).toBeNull();

    const noMatchCtx = makeCtx({ untypedShiftCount: 0 });
    expect(getActiveHighlight(noMatchCtx, new Date('2026-05-02'))).toBeNull();
  });
});
