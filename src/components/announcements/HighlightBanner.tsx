import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getActiveHighlight,
  ANNOUNCEMENT_DISMISS_PREFIX,
  type AnnouncementContext,
} from '@/lib/announcements';

interface Props {
  ctx: Omit<AnnouncementContext, 'profile' | 'userCreatedAt'>;
}

/**
 * Renders at most ONE highlight announcement above the dashboard.
 * Dismissal moves the entry into the What's New panel only.
 */
export function HighlightBanner({ ctx }: Props) {
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();

  const announcement = useMemo(
    () =>
      getActiveHighlight({
        ...ctx,
        profile,
        userCreatedAt: user?.created_at ?? null,
      }),
    [ctx, profile, user?.created_at],
  );

  const navigate = useNavigate();
  if (!announcement || !profile) return null;

  const dismiss = async () => {
    await updateProfile({
      dismissed_prompts: {
        ...(profile.dismissed_prompts || {}),
        [`${ANNOUNCEMENT_DISMISS_PREFIX}${announcement.id}`]: true,
      },
    });
  };

  const handleCta = async () => {
    await dismiss();
    if (announcement.cta) navigate(announcement.cta.to);
  };

  const Icon = announcement.icon ?? Sparkles;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mb-2">
      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground mb-0.5">
          New: {announcement.title}
        </p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          {announcement.body}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {announcement.cta && (
            <button
              type="button"
              onClick={handleCta}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              {announcement.cta.label}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-[12px] text-muted-foreground hover:text-foreground ml-2"
          >
            Skip for now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
