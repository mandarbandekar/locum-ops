import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AttentionItem, ReminderModule } from './NeedsAttentionCard';

const GROUP_DEFS: { key: string; title: string; modules: ReminderModule[] }[] = [
  { key: 'payments', title: 'Payments', modules: ['invoices'] },
  { key: 'credentials', title: 'Credentials', modules: ['credentials'] },
  { key: 'taxes', title: 'Taxes', modules: ['taxes'] },
  { key: 'schedule', title: 'Schedule', modules: ['shifts', 'contracts', 'outreach'] },
];

interface Props {
  items: AttentionItem[];
}

export function AttentionGroupedList({ items }: Props) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  const grouped = GROUP_DEFS
    .map(g => ({
      ...g,
      items: items
        .filter(i => i.module && g.modules.includes(i.module))
        .sort((a, b) => a.urgency - b.urgency),
    }))
    .filter(g => g.items.length > 0);

  // Catch any unmoduled items — append to first group
  const unmoduled = items.filter(i => !i.module);
  if (unmoduled.length > 0 && grouped[0]) {
    grouped[0].items.push(...unmoduled);
  }

  return (
    <section className="bg-card rounded-lg border border-border-subtle shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
        <div className="p-2 rounded-lg bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
        <h2
          className="font-semibold text-foreground flex-1"
          style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '16px' }}
        >
          Needs Your Attention
        </h2>
        <Badge className="h-6 min-w-6 px-2 flex items-center justify-center rounded-full text-[11px] font-bold bg-warning/15 text-warning border-0 hover:bg-warning/15">
          {items.length}
        </Badge>
      </div>

      {/* Grouped lists */}
      <div className="divide-y divide-border-subtle">
        {grouped.map(group => (
          <div key={group.key} className="px-5 py-3">
            <p
              className="text-[11px] font-semibold uppercase mb-1.5"
              style={{ letterSpacing: '0.05em', color: '#6B7280' }}
            >
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item, i) => (
                <div
                  key={`${group.key}-${i}`}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group"
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
          </div>
        ))}
      </div>
    </section>
  );
}
