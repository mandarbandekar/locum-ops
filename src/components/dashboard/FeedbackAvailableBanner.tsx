import { MessageCircle, X } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';

export function FeedbackAvailableBanner() {
  const { profile, updateProfile } = useUserProfile();

  if (!profile) return null;
  if (profile.dismissed_prompts?.feedback_announcement) return null;

  const dismiss = async () => {
    await updateProfile({
      dismissed_prompts: {
        ...(profile.dismissed_prompts || {}),
        feedback_announcement: true,
      },
    });
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mb-2">
      <MessageCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground mb-0.5">
          Got feedback? We're listening.
        </p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          You can now send bugs, ideas, or confusion straight from the app — look for the Feedback button in the top right.
        </p>
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
