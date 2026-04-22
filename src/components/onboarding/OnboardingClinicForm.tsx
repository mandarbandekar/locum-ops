import { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { AddClinicStepper, type AddClinicStepperHandle } from '@/components/facilities/AddClinicStepper';

interface Props {
  onSaved: () => void;
}

/**
 * Onboarding wrapper around the shared AddClinicStepper.
 *
 * Exposes a hidden <button id="onboarding-clinic-save"> so the OnboardingPage
 * sticky footer can drive the stepper. Click semantics:
 *   - When not on the last step: advances to the next step.
 *   - When on the last step: saves the facility.
 *
 * Also exposes data attributes used by the parent to render contextual labels.
 */
export function OnboardingClinicForm({ onSaved }: Props) {
  const handleRef = useRef<AddClinicStepperHandle | null>(null);
  const [, forceRender] = useState(0);

  // Re-render the hidden CTA when stepper state changes.
  useEffect(() => {
    const id = window.setInterval(() => forceRender(n => n + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  const handle = handleRef.current;
  const isLast = handle ? handle.step === handle.totalSteps : false;
  const canSave = handle ? handle.canSave : false;

  return (
    <>
      <AddClinicStepper
        ref={(h) => { handleRef.current = h; }}
        onSaved={() => onSaved()}
      />

      {/* Hidden CTA driven by the OnboardingPage sticky footer */}
      <button
        id="onboarding-clinic-save"
        type="button"
        onClick={() => handleRef.current?.next()}
        disabled={!canSave && (handleRef.current?.step ?? 1) === 1}
        className="hidden"
        data-can-save={canSave}
        data-step={handle?.step ?? 1}
        data-total-steps={handle?.totalSteps ?? 4}
        data-is-last={isLast}
        data-primary-label={handle?.primaryLabel ?? 'Continue'}
      />
      <button
        id="onboarding-clinic-back"
        type="button"
        onClick={() => handleRef.current?.back()}
        disabled={!handle?.canBack}
        className="hidden"
        data-can-back={handle?.canBack ?? false}
      />
      <button
        id="onboarding-clinic-skip"
        type="button"
        onClick={() => handleRef.current?.skip()}
        disabled={!handle?.canSkip}
        className="hidden"
        data-can-skip={handle?.canSkip ?? false}
      />
    </>
  );
}
