import { useMemo } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getVisibleAnnouncements,
  getUnreadAnnouncements,
  isAnnouncementDismissed,
  ANNOUNCEMENT_DISMISS_PREFIX,
  ANNOUNCEMENT_HIDE_PREFIX,
  type Announcement,
} from '@/lib/announcements';
import { cn } from '@/lib/utils';

/**
 * Header pill that lists every audience-matched announcement, newest first.
 * Replaces the per-feature top-of-dashboard banners.
 */
export function WhatsNewButton() {
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  // useData is only available inside DataProvider (i.e. authenticated app shell).
  let shifts: any[] = [];
  let facilities: any[] = [];
  try {
    const data = useData();
    shifts = data.shifts;
    facilities = data.facilities;
  } catch {
    // Outside provider — render nothing.
  }

  const ctx = useMemo(
    () => ({
      profile,
      shifts,
      facilities,
      untypedShiftCount: shifts.filter(s => !s.shift_type).length,
      userCreatedAt: user?.created_at ?? null,
    }),
    [profile, shifts, facilities, user?.created_at],
  );

  const visible = useMemo(() => getVisibleAnnouncements(ctx), [ctx]);
  const unread = useMemo(() => getUnreadAnnouncements(ctx), [ctx]);

  if (!profile) return null;
  if (visible.length === 0) return null;

  const markRead = async (id: string) => {
    if (isAnnouncementDismissed(profile, id)) return;
    await updateProfile({
      dismissed_prompts: {
        ...(profile.dismissed_prompts || {}),
        [`${ANNOUNCEMENT_DISMISS_PREFIX}${id}`]: true,
      },
    });
  };

  const markAllRead = async () => {
    const updates = { ...(profile.dismissed_prompts || {}) };
    for (const a of visible) updates[`${ANNOUNCEMENT_DISMISS_PREFIX}${a.id}`] = true;
    await updateProfile({ dismissed_prompts: updates });
  };

  const handleCta = async (a: Announcement) => {
    await markRead(a.id);
    if (a.cta) navigate(a.cta.to);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs relative"
          aria-label={`What's new${unread.length > 0 ? ` (${unread.length} unread)` : ''}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">What's new</span>
          {unread.length > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center"
              aria-hidden="true"
            >
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">What's new</h3>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          <ul className="divide-y divide-border">
            {visible.map(a => {
              const Icon = a.icon;
              const unreadItem = !isAnnouncementDismissed(profile, a.id);
              return (
                <li
                  key={a.id}
                  className={cn(
                    'px-4 py-3 flex gap-3',
                    unreadItem && 'bg-primary/[0.04]',
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {Icon ? (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">
                        {a.title}
                      </p>
                      {unreadItem && (
                        <button
                          type="button"
                          onClick={() => markRead(a.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Mark as read"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                      {a.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {a.cta && (
                        <button
                          type="button"
                          onClick={() => handleCta(a)}
                          className="text-[12px] font-semibold text-primary hover:underline"
                        >
                          {a.cta.label} →
                        </button>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {format(parseISO(a.publishedAt), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
