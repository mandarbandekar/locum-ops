import { type ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedStepProps {
  /** Step title shown as a small heading. */
  title: string;
  /** One-line subtitle below the title. Optional. */
  subtitle?: string;
  /** Lucide icon rendered next to the title. Optional. */
  icon?: LucideIcon;
  /** "Why we ask" callout body. Optional — when omitted the callout is hidden. */
  whyWeAsk?: ReactNode;
  /** Optional preview / impact card rendered below the inputs (e.g. live invoice preview). */
  preview?: ReactNode;
  /** Step body (form inputs). */
  children: ReactNode;
  className?: string;
}

/**
 * Shared step wrapper for the Add Clinic and Add Shift guided flows.
 * Provides a consistent visual rhythm: title + subtitle, "Why we ask" callout,
 * inputs, and an optional impact preview at the bottom.
 */
export function GuidedStep({
  title,
  subtitle,
  icon: Icon,
  whyWeAsk,
  preview,
  children,
  className,
}: GuidedStepProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
          <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        )}
      </div>

      {whyWeAsk && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div className="text-[12px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">Why we ask · </span>
            {whyWeAsk}
          </div>
        </div>
      )}

      <div className="space-y-3">{children}</div>

      {preview && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          {preview}
        </div>
      )}
    </div>
  );
}
