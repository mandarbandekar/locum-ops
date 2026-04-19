import { Sparkles, AlertCircle } from 'lucide-react';

interface BriefingBannerProps {
  sentences: string[];
  hasUrgentItem: boolean;
  greeting?: string;
}

export function BriefingBanner({ sentences, hasUrgentItem, greeting }: BriefingBannerProps) {
  const Icon = hasUrgentItem ? AlertCircle : Sparkles;
  const paragraph = sentences.join(' ');
  const accentClass = hasUrgentItem ? 'bg-amber-500' : 'bg-primary';
  const iconClass = hasUrgentItem ? 'text-amber-500' : 'text-primary';

  return (
    <div className="relative bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />
      <div className="flex items-start gap-3 px-5 py-5 pl-6">
        <Icon className={`h-5 w-5 shrink-0 mt-1 ${iconClass}`} />
        <div className="flex-1 min-w-0">
          {greeting && (
            <h2
              className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-tight mb-1.5"
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
              fontSize: '15px',
              lineHeight: 1.6,
            }}
          >
            {paragraph}
          </p>
        </div>
      </div>
    </div>
  );
}
