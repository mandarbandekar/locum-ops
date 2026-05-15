import { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BriefingBannerProps {
  sentences: string[];
  hasUrgentItem: boolean;
  greeting?: string;
}

export function BriefingBanner({ sentences, hasUrgentItem, greeting }: BriefingBannerProps) {
  const Icon = hasUrgentItem ? AlertCircle : Sparkles;
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  const visibleSentences = isMobile && !expanded ? sentences.slice(0, 2) : sentences;
  const paragraph = visibleSentences.join(' ');
  const hasMore = isMobile && sentences.length > 2;
  const accentClass = hasUrgentItem ? 'bg-amber-500' : 'bg-primary';
  const iconClass = hasUrgentItem ? 'text-amber-500' : 'text-primary';

  return (
    <div className="relative bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />
      <div className="flex items-start gap-3 px-4 sm:px-5 py-4 sm:py-5 pl-5 sm:pl-6">
        <Icon className={`h-5 w-5 shrink-0 mt-1 ${iconClass}`} />
        <div className="flex-1 min-w-0">
          {greeting && (
            <h2
              className="text-[18px] sm:text-[22px] font-semibold text-foreground tracking-tight mb-1.5"
              style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
            >
              {greeting}
            </h2>
          )}
          <p
            key={paragraph /* re-trigger fade on content change */}
            className="text-foreground/80 animate-in fade-in duration-200"
            style={{
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              fontSize: isMobile ? '14px' : '15px',
              lineHeight: 1.6,
            }}
          >
            {paragraph}
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              {expanded ? 'Show less' : `Show ${sentences.length - 2} more`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
