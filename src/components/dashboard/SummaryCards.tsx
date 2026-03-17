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
    <Card className="cursor-pointer hover:bg-muted/30 hover:shadow-card transition-all group" onClick={onClick}>
      <CardContent className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`h-4 w-4 ${accentClass}`} />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        </div>
        <p className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight">{value}</p>
        <p className="text-[13px] text-muted-foreground line-clamp-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
