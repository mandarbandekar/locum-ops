import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
    <div className="flex flex-wrap items-center gap-2" data-testid="work-readiness-strip">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Work Readiness</span>
      {items.map((item, i) => (
        <button
          key={i}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-card hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => navigate(item.link)}
        >
          {item.text}
          <ArrowRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
