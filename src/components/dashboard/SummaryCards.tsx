import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface SummaryCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  onClick: () => void;
  accentClass: string;
  bgClass: string;
}

export function SummaryCard({ icon: Icon, title, value, subtitle, onClick, accentClass, bgClass }: SummaryCardProps) {
  return (
    <Card className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={onClick}>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${bgClass}`}>
            <Icon className={`h-3.5 w-3.5 ${accentClass}`} />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        </div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
