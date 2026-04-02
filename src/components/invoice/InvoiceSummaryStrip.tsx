import { AlertTriangle, Send, FileEdit, CheckCircle } from 'lucide-react';

interface StatCard {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  accentClass: string;
  bgClass: string;
  onClick?: () => void;
  annotation?: string;
}

interface Props {
  overdue: { count: number; total: number };
  awaiting: { count: number; total: number };
  readyToReview: { count: number; total: number };
  upcomingCount?: number;
  paidThisMonth: { count: number; total: number };
  onScrollTo: (group: string) => void;
}

export function InvoiceSummaryStrip({ overdue, awaiting, readyToReview, upcomingCount, paidThisMonth, onScrollTo }: Props) {
  const cards: StatCard[] = [
    {
      label: 'Overdue',
      ...overdue,
      icon: <AlertTriangle className="h-4 w-4" />,
      accentClass: 'text-destructive',
      bgClass: 'bg-destructive/10 border-destructive/20',
      onClick: () => onScrollTo('overdue'),
    },
    {
      label: 'Awaiting Payment',
      ...awaiting,
      icon: <Send className="h-4 w-4" />,
      accentClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-500/10 border-blue-500/20',
      onClick: () => onScrollTo('awaiting'),
    },
    {
      label: 'Ready to Review',
      ...readyToReview,
      icon: <FileEdit className="h-4 w-4" />,
      accentClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 border-amber-500/20',
      onClick: () => onScrollTo('drafts'),
      annotation: upcomingCount && upcomingCount > 0 ? `+${upcomingCount} upcoming` : undefined,
    },
    {
      label: 'Paid This Month',
      ...paidThisMonth,
      icon: <CheckCircle className="h-4 w-4" />,
      accentClass: 'text-primary',
      bgClass: 'bg-primary/10 border-primary/20',
      onClick: () => onScrollTo('paid'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <button
          key={card.label}
          onClick={card.onClick}
          className={`rounded-xl border p-3.5 text-left transition-all hover:shadow-md hover:scale-[1.02] ${card.bgClass}`}
        >
          <div className={`flex items-center gap-1.5 text-xs font-medium ${card.accentClass}`}>
            {card.icon}
            {card.label}
          </div>
          <div className={`text-xl font-bold mt-1 ${card.accentClass}`}>
            ${card.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {card.count} invoice{card.count !== 1 ? 's' : ''}
          </div>
        </button>
      ))}
    </div>
  );
}
