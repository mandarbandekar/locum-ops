/**
 * Onboarding analytics helper.
 *
 * Thin typed wrapper over PostHog so onboarding instrumentation is consistent,
 * greppable, and safe to call before PostHog is initialized.
 *
 * Event taxonomy (Phase 4):
 *   Rate Card:
 *     - onboarding_rate_card_viewed
 *     - onboarding_billing_preference_selected
 *     - onboarding_rate_added
 *     - onboarding_rate_removed
 *     - onboarding_rate_card_completed
 *   Clinic:
 *     - onboarding_clinic_viewed
 *     - onboarding_clinic_completed
 *   Bulk Shifts:
 *     - onboarding_bulk_shifts_viewed
 *     - onboarding_shift_dates_selected
 *     - onboarding_bulk_shifts_created
 *   Invoice Reveal:
 *     - onboarding_invoice_reveal_viewed
 *     - onboarding_invoice_preview_opened
 *     - onboarding_invoice_continue_clicked
 *   Loop Choice:
 *     - onboarding_loop_add_clinic_clicked
 *     - onboarding_loop_add_shifts_clicked
 *     - onboarding_loop_done_clicked
 *   Business Map:
 *     - onboarding_business_map_viewed
 *     - onboarding_completed
 *   Activation:
 *     - onboarding_activation_reached
 */

import { posthog } from '@/lib/posthog';

export type OnboardingEvent =
  | 'onboarding_rate_card_viewed'
  | 'onboarding_billing_preference_selected'
  | 'onboarding_rate_added'
  | 'onboarding_rate_removed'
  | 'onboarding_rate_card_completed'
  | 'onboarding_clinic_viewed'
  | 'onboarding_clinic_completed'
  | 'onboarding_bulk_shifts_viewed'
  | 'onboarding_shift_dates_selected'
  | 'onboarding_bulk_shifts_created'
  | 'onboarding_invoice_reveal_viewed'
  | 'onboarding_invoice_preview_opened'
  | 'onboarding_invoice_continue_clicked'
  | 'onboarding_loop_add_clinic_clicked'
  | 'onboarding_loop_add_shifts_clicked'
  | 'onboarding_loop_done_clicked'
  | 'onboarding_business_map_viewed'
  | 'onboarding_completed'
  | 'onboarding_activation_reached';

export type OnboardingEventProps = Record<string, string | number | boolean | null | undefined>;

export function trackOnboarding(event: OnboardingEvent, props: OnboardingEventProps = {}): void {
  try {
    posthog.capture(event, props);
  } catch {
    // PostHog not initialized or blocked — never break the onboarding flow.
  }
}

/**
 * Fires `onboarding_activation_reached` exactly once per session when the
 * activation criteria are met:
 *   - rate card completed
 *   - ≥1 clinic created
 *   - ≥2 shifts created
 *   - invoice reveal viewed
 */
let activationFired = false;
/**
 * Activation criteria:
 *   Standard path: rate card completed + ≥1 clinic + ≥2 shifts + invoice reveal viewed.
 *   Skip path (existing users who chose "Skip for now" on Rate Card):
 *     same criteria minus rate card completion — they already had clinic-level rates,
 *     so reaching the invoice reveal with real shifts is still a valid activation.
 *
 * `pathway` is included as an event property so funnels can segment skip vs. standard.
 */
export function maybeTrackActivation(input: {
  rateCardCompleted: boolean;
  rateCardSkipped?: boolean;
  clinicCount: number;
  shiftCount: number;
  invoiceRevealSeen: boolean;
  draftInvoiceCount: number;
  projectedGross: number;
}): void {
  if (activationFired) return;
  const baseReached =
    input.clinicCount >= 1 && input.shiftCount >= 2 && input.invoiceRevealSeen;
  const reached =
    baseReached && (input.rateCardCompleted || !!input.rateCardSkipped);
  if (!reached) return;
  activationFired = true;
  trackOnboarding('onboarding_activation_reached', {
    clinic_count: input.clinicCount,
    shift_count: input.shiftCount,
    draft_invoice_count: input.draftInvoiceCount,
    projected_gross: Math.round(input.projectedGross),
    pathway: input.rateCardCompleted ? 'standard' : 'skip',
  });
}

/** Test/internal helper — resets the activation latch. Not used in app code. */
export function _resetOnboardingActivationLatch(): void {
  activationFired = false;
}
