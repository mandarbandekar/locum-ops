import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  icon?: React.ElementType;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

interface Rect {
  top: number; left: number; width: number; height: number;
}

const PAD = 8;
const TOOLTIP_GAP = 12;

function getPlacement(targetRect: Rect, placement: string, tooltipW: number, tooltipH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0, left = 0;

  switch (placement) {
    case 'bottom':
      top = targetRect.top + targetRect.height + PAD + TOOLTIP_GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case 'top':
      top = targetRect.top - PAD - TOOLTIP_GAP - tooltipH;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.left - PAD - TOOLTIP_GAP - tooltipW;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.left + targetRect.width + PAD + TOOLTIP_GAP;
      break;
  }

  // Clamp
  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  return { top, left };
}

const SIDEBAR_TOUR_IDS = ['facilities', 'schedule', 'invoices', 'business', 'tax'];

function isSidebarStep(selector: string) {
  return SIDEBAR_TOUR_IDS.some(id => selector.includes(`data-tour="${id}"`));
}

export function SpotlightTour({ steps, isOpen, onClose }: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const { state: sidebarState, setOpen: setSidebarOpen } = useSidebar();
  const sidebarWasCollapsedRef = useRef(false);

  const handleClose = useCallback(() => {
    if (sidebarWasCollapsedRef.current) {
      setSidebarOpen(false);
      sidebarWasCollapsedRef.current = false;
    }
    onClose();
  }, [onClose, setSidebarOpen]);

  const step = steps[currentStep];

  // Find target element and track its position
  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step]);

  // Expand sidebar when targeting sidebar items
  useEffect(() => {
    if (!isOpen || !step) return;

    // If this is a sidebar step and sidebar is collapsed, expand it
    if (isSidebarStep(step.targetSelector) && sidebarState === 'collapsed') {
      sidebarWasCollapsedRef.current = true;
      setSidebarOpen(true);
      setTimeout(updateRect, 350);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Try expanding collapsed sidebar groups
      const collapsibles = document.querySelectorAll('[data-state="closed"].group\\/collapsible');
      collapsibles.forEach(c => {
        const trigger = c.querySelector('[data-radix-collapsible-trigger]') as HTMLElement;
        if (trigger) trigger.click();
      });
      setTimeout(updateRect, 350);
    }
  }, [isOpen, step, updateRect, sidebarState, setSidebarOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setVisible(false);
      return;
    }
    // Small delay for layout
    const t = setTimeout(() => {
      updateRect();
      setVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [isOpen, currentStep, updateRect]);

  // Scroll target into view
  useEffect(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setTimeout(updateRect, 400);
    }
  }, [isOpen, currentStep, step, updateRect]);

  // Recalc on resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => updateRect();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isOpen, updateRect]);

  // Position tooltip
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tr = tooltipRef.current.getBoundingClientRect();
    const placement = step?.placement || 'bottom';
    setTooltipPos(getPlacement(targetRect, placement, tr.width, tr.height));
  }, [targetRect, step, visible]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) setCurrentStep(s => s + 1);
      if (e.key === 'ArrowLeft' && currentStep > 0) setCurrentStep(s => s - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, currentStep, steps.length, onClose]);

  if (!isOpen || !step) return null;

  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon || Lightbulb;

  return createPortal(
    <div className={cn("fixed inset-0 z-[100] transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}>
      {/* Overlay with cutout */}
      {targetRect ? (
        <div
          className="absolute rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            border: '2px solid hsl(var(--primary) / 0.5)',
          }}
        >
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-xl animate-pulse border-2 border-primary/30" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      {/* Click blocker */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute z-[101] w-[340px] max-w-[calc(100vw-24px)] bg-card border border-border rounded-2xl shadow-lg transition-all duration-300"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="text-[15px] font-bold text-foreground mt-1 leading-tight">{step.title}</h3>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pb-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === currentStep ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/25"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip Tour
          </Button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(s => s - 1)}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (isLast) onClose();
                else setCurrentStep(s => s + 1);
              }}
              className="h-8 px-4 text-xs"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
