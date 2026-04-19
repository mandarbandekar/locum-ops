import { Sparkles, AlertCircle } from 'lucide-react';

interface BriefingBannerProps {
  sentences: string[];
  hasUrgentItem: boolean;
}

export function BriefingBanner({ sentences, hasUrgentItem }: BriefingBannerProps) {
  const accent = hasUrgentItem ? '#A07D3E' : '#1A5C6B';
  const Icon = hasUrgentItem ? AlertCircle : Sparkles;
  const paragraph = sentences.join(' ');

  return (
    <div className="relative bg-card rounded-lg border border-border-subtle shadow-sm overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <div className="flex items-start gap-3 px-5 py-4 pl-6">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
        <p
          key={paragraph /* re-trigger fade on content change */}
          className="text-foreground animate-in fade-in duration-200"
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#374151',
          }}
        >
          {paragraph}
        </p>
      </div>
    </div>
  );
}
