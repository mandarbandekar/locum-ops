import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, X, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { inferShiftTypeFromName } from '@/lib/shiftTypeInference';
import type { Shift, Facility } from '@/types';

interface ShiftTypeMigrationBannerProps {
  /** Number of existing shifts that have no shift_type set. */
  untypedShiftCount: number;
  /** All shifts (used to find a representative untyped one for the preview). */
  shifts?: Shift[];
  /** Facilities (for resolving name in the preview). */
  facilities?: Facility[];
}

const TYPE_LABELS: Record<string, string> = {
  gp: 'GP',
  er: 'ER',
  surgery: 'Surgery',
  dental: 'Dental',
  wellness: 'Wellness',
  oncall: 'On-Call',
  telemed: 'Telemed',
  specialty: 'Specialty',
  shelter: 'Shelter',
};

/**
 * One-time nudge for pre-existing users to adopt the new Shift Type feature
 * on their Rate Card. Visible only when there are untyped historical shifts
 * AND the user hasn't dismissed the prompt. Dismissal lives on
 * `profile.dismissed_prompts.shift_type_migration`.
 */
export function ShiftTypeMigrationBanner({
  untypedShiftCount,
  shifts = [],
  facilities = [],
}: ShiftTypeMigrationBannerProps) {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();

  // Pick a representative untyped shift + infer its tag from the matching rate name.
  const preview = useMemo(() => {
    if (!profile) return null;
    const untyped = shifts.filter(s => !s.shift_type);
    if (untyped.length === 0) return null;

    // Prefer the most recent untyped shift — feels most relevant to the user.
    const sample = [...untyped].sort((a, b) =>
      b.start_datetime.localeCompare(a.start_datetime)
    )[0];

    // Try to find the rate this shift used (match by amount + basis when possible).
    const rates = profile.default_rates || [];
    const matchedRate =
      rates.find(r =>
        r.amount === sample.rate_applied &&
        ((r.basis === 'hourly' && sample.rate_kind === 'hourly') ||
          (r.basis === 'daily' && sample.rate_kind !== 'hourly'))
      ) || rates.find(r => r.amount === sample.rate_applied);

    const inferredSlug = matchedRate?.shift_type || inferShiftTypeFromName(matchedRate?.name);
    if (!inferredSlug) return null;

    const facility = facilities.find(f => f.id === sample.facility_id);
    return {
      facilityName: facility?.name || 'Shift',
      dateLabel: format(parseISO(sample.start_datetime), 'MMM d'),
      typeLabel: TYPE_LABELS[inferredSlug] || inferredSlug.toUpperCase(),
      rateName: matchedRate?.name,
    };
  }, [profile, shifts, facilities]);

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
          New: categorize your rates
        </p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          Tag each rate with a shift type (GP, ER, Surgery…) so it shows up across your schedule and invoices. We've pre-filled suggestions where we could.
        </p>

        {preview && (
          <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-md bg-background/60 border border-primary/15 max-w-fit">
            <span className="text-[12px] text-foreground font-medium truncate">
              {preview.facilityName} · {preview.dateLabel}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">Suggested:</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/15 text-primary">
              {preview.typeLabel}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => navigate('/settings/rate-card')}
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            Review & Save
          </button>
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
