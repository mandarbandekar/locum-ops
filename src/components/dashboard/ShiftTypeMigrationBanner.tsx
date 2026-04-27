import { useNavigate } from 'react-router-dom';
import { Tag, X } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ShiftTypeMigrationBannerProps {
  /** Number of existing shifts that have no shift_type set. */
  untypedShiftCount: number;
}

/**
 * One-time nudge for pre-existing users to adopt the new Shift Type feature
 * on their Rate Card. Visible only when there are untyped historical shifts
 * AND the user hasn't dismissed the prompt. Dismissal lives on
 * `profile.dismissed_prompts.shift_type_migration`.
 */
export function ShiftTypeMigrationBanner({ untypedShiftCount }: ShiftTypeMigrationBannerProps) {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();

  if (!profile) return null;
  if (profile.dismissed_prompts?.shift_type_migration) return null;
  if (untypedShiftCount === 0) return null;

  const dismiss = async () => {
    await updateProfile({
      dismissed_prompts: {
        ...(profile.dismissed_prompts || {}),
        shift_type_migration: true,
      },
    });
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mb-2">
      <Tag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground mb-0.5">
          Categorize your relief work
        </p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          You can now tag each rate by shift type — GP, ER, Surgery, Dental, On-Call, and more.
          New shifts pick up the type automatically, and you can apply the same types to your
          {untypedShiftCount > 0 ? ` ${untypedShiftCount} past ` : ' past '}shift{untypedShiftCount === 1 ? '' : 's'} in one click.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => navigate('/settings/rate-card')}
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            Set up shift types →
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-[12px] text-muted-foreground hover:text-foreground ml-2"
          >
            Not now
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
