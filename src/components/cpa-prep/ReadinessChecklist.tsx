import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { ReadinessItem } from '@/hooks/useCPAPrepData';

const icons = { ok: CheckCircle2, warning: AlertCircle, missing: XCircle };
const colors = { ok: 'text-green-600 dark:text-green-400', warning: 'text-orange-500', missing: 'text-red-500' };

interface Props { items: ReadinessItem[] }

export default function ReadinessChecklist({ items }: Props) {
  const okCount = items.filter(i => i.status === 'ok').length;
  const total = items.length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{okCount} of {total} items ready — {okCount === total ? "You're all set!" : 'review items below before your CPA meeting.'}</p>
      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = icons[item.status];
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colors[item.status]}`} />
              <span className={item.status === 'ok' ? 'text-muted-foreground' : ''}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
