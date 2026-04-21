import type { Facility } from '@/types';

export type EngagementType = 'direct' | 'third_party' | 'w2';
export type TaxFormType = '1099' | 'w2';

export const THIRD_PARTY_PRESETS = [
  'Roo',
  'IndeVets',
  'Serenity Vet',
  'Evette',
  'VetNow',
] as const;

export const W2_EMPLOYER_PRESETS = [
  'VCA',
  'Banfield',
  'BluePearl',
  'MedVet',
  'Ethos',
  'Pathway',
  'NVA',
] as const;

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  direct: 'Direct / Independent',
  third_party: 'Via Platform or Agency',
  w2: 'W-2 Employer',
};

export const ENGAGEMENT_DESCRIPTIONS: Record<EngagementType, string> = {
  direct: 'You bill the clinic directly. LocumOps generates your invoices.',
  third_party: 'A platform or staffing agency books and pays you (Roo, IndeVets, etc.).',
  w2: 'You are a W-2 employee of a corporate group (VCA, Banfield, etc.).',
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
  if (type === 'third_party') {
    return {
      label: source || 'Platform',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60',
    };
  }
  return {
    label: source ? `W-2: ${source}` : 'W-2',
    className:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60',
  };
}
