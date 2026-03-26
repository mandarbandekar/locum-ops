import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export interface AttentionItem {
  title: string;
  context: string;
  link: string;
  icon: React.ElementType;
  urgency: number;
  amount?: string;
}

interface NeedsAttentionCardProps {
  items: AttentionItem[];
}

export function NeedsAttentionCard({ items }: NeedsAttentionCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold">Needs Attention</p>
              <p className="text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs font-bold bg-warning/10 text-warning border-0">
              {items.length}
            </Badge>
          )}
        </div>

        {/* Items */}
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-foreground">You're all caught up! 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">No items need your attention.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.slice(0, 6).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(item.link)}
                >
                  <div className="p-1.5 rounded-md bg-muted shrink-0">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.context}</p>
                  </div>
                  {item.amount && (
                    <span className="text-sm font-bold text-foreground shrink-0">{item.amount}</span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
