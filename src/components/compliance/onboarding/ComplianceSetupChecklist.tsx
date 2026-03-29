import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ShieldCheck, Upload, GraduationCap, Eye, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  action: string;
}

interface Props {
  items: ChecklistItem[];
  onAction: (action: string) => void;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  'add-credential': Plus,
  'upload-document': Upload,
  'add-ce': GraduationCap,
  'review-renewals': Eye,
};

const ACTION_LABELS: Record<string, string> = {
  'add-credential': 'Add',
  'upload-document': 'Upload',
  'add-ce': 'Add CE',
  'review-renewals': 'Review',
};

export function ComplianceSetupChecklist({ items, onAction }: Props) {
  const doneCount = items.filter(i => i.done).length;
  const progress = (doneCount / items.length) * 100;

  if (doneCount >= items.length) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Complete your setup
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">{doneCount} of {items.length} completed</span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(item => {
          const Icon = ACTION_ICONS[item.action] || Plus;
          return (
            <div
              key={item.key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-colors',
                item.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-card hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn('text-sm', item.done && 'text-muted-foreground line-through')}>{item.label}</span>
              </div>
              {!item.done && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onAction(item.action)}>
                  <Icon className="h-3 w-3" />
                  {ACTION_LABELS[item.action] || 'Do'}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
