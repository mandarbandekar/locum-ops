import type { Facility, Shift } from '@/types';

export type EngagementType = 'direct' | 'third_party';
export type TaxFormType = '1099' | 'w2';

export const THIRD_PARTY_PRESETS = [
  'Roo',
  'IndeVets',
  'Serenity Vet',
  'Evette',
  'VetNow',
] as const;

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  direct: 'Direct / Independent',
  third_party: 'Via Platform or Agency',
};

export const ENGAGEMENT_DESCRIPTIONS: Record<EngagementType, string> = {
  direct: 'You bill the clinic directly. LocumOps generates your invoices.',
  third_party: 'A platform or staffing agency books and pays you (Roo, IndeVets, etc.).',
};

export interface EngagementPill {
  label: string;
  /** Tailwind classes (light + dark mode aware) */
  className: string;
}

export function getEngagementPill(facility: Pick<Facility, 'engagement_type' | 'source_name'>): EngagementPill {
  const type = (facility.engagement_type || 'direct') as EngagementType;
  const source = (facility.source_name || '').trim();
  if (type === 'direct') {
    return {
      label: 'Direct',
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60',
    };
  }
  return {
    label: source || 'Platform',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60',
  };
}

/**
 * Compute the effective engagement for a shift, applying any per-shift
 * overrides on top of the facility default.
 */
export function getEffectiveEngagement(
  shift: Pick<Shift, 'engagement_type_override' | 'source_name_override'>,
  facility: Pick<Facility, 'engagement_type' | 'source_name' | 'tax_form_type'>,
): { engagement_type: EngagementType; source_name: string | null; tax_form_type: TaxFormType | null } {
  const engagement_type = (shift.engagement_type_override || facility.engagement_type || 'direct') as EngagementType;
  const source_name = shift.engagement_type_override
    ? (shift.source_name_override ?? null)
    : (facility.source_name ?? null);
  return {
    engagement_type,
    source_name,
    tax_form_type: (facility.tax_form_type ?? null) as TaxFormType | null,
  };
}

/**
 * Build the helper-line copy shown in the shift form, driven by the
 * facility's engagement_type and tax_form_type.
 */
export function getShiftEngagementHelperText(
  facility: Pick<Facility, 'engagement_type' | 'source_name' | 'tax_form_type'>,
): string {
  const type = (facility.engagement_type || 'direct') as EngagementType;
  const source = (facility.source_name || '').trim() || 'this platform';
  if (type === 'direct') {
    return 'Direct booking — an invoice will be created after this shift.';
  }
  if (facility.tax_form_type === 'w2') {
    return `Booked via ${source} — no invoice will be generated. This income will appear on your W-2 from ${source}.`;
  }
  return `Booked via ${source} — no invoice will be generated. A 1099 is expected from ${source} at year-end.`;
}
