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
    <Card className="h-full flex flex-col border-0 shadow-md">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Needs Attention</p>
              <p className="text-[11px] text-muted-foreground">
                {items.length} item{items.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <Badge className="h-6 w-6 p-0 flex items-center justify-center rounded-full text-[11px] font-bold bg-warning/15 text-warning border-0 hover:bg-warning/15">
              {items.length}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5" />

        {/* Items */}
        <div className="flex-1 px-5 pt-3 pb-4">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-foreground">You're all caught up! 🎉</p>
              <p className="text-[11px] text-muted-foreground mt-1">No items need your attention.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.slice(0, 6).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(item.link)}
                >
                  <div className="p-1.5 rounded-md bg-muted shrink-0">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate leading-tight">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.context}</p>
                  </div>
                  {item.amount && (
                    <span className="text-[13px] font-bold text-foreground shrink-0">{item.amount}</span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
