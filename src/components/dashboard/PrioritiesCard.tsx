import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PriorityItem {
  title: string;
  context: string;
  link: string;
  icon: React.ElementType;
  urgency: number;
}

interface PrioritiesCardProps {
  items: PriorityItem[];
  maxVisible?: number;
}

export function PrioritiesCard({ items, maxVisible = 5 }: PrioritiesCardProps) {
  const navigate = useNavigate();
  const visible = items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <Card className="h-fit" data-testid="priorities-card">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-semibold">Priorities</CardTitle>
        <p className="text-xs text-muted-foreground">Top actions for today</p>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {visible.length === 0 ? (
          <div className="py-3 text-center">
            <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-medium text-foreground">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {visible.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => navigate(item.link)}
              >
                <div className="p-1.5 rounded bg-muted shrink-0">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.context}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
            {remaining > 0 && (
              <button
                className="text-xs text-primary hover:underline mt-1 ml-2"
                onClick={() => navigate('/schedule')}
              >
                View all priorities ({remaining} more)
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
