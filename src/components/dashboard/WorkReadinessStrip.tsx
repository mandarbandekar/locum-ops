import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export interface ReadinessItem {
  text: string;
  link: string;
}

interface WorkReadinessStripProps {
  items: ReadinessItem[];
}

export function WorkReadinessStrip({ items }: WorkReadinessStripProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-1" data-testid="work-readiness-strip">
      <div className="flex items-center gap-1.5 mr-1">
        <Zap className="h-3 w-3 text-warning" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Work Readiness</span>
      </div>
      {items.map((item, i) => (
        <button
          key={i}
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border border-border/60 bg-card hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => navigate(item.link)}
        >
          {item.text}
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      ))}
    </div>
  );
}
