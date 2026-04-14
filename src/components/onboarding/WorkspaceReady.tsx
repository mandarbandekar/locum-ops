import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import type { Facility, Shift, Invoice } from '@/types';

interface Props {
  facilities: Facility[];
  shifts: Shift[];
  invoices: Invoice[];
  taxEnabled: boolean;
  shiftRate: number | null;
  onNavigate: (path: string) => void;
  onCompleteOnboarding: () => Promise<void>;
}

interface ResultItem {
  icon: string;
  label: string;
  detail: string;
  completed: boolean;
}

export function WorkspaceReady({ facilities, shifts, invoices, taxEnabled, shiftRate }: Props) {
  const draftInvoice = invoices.find(i => i.status === 'draft');
  const quarterlyEst = shiftRate ? shiftRate * 60 * 0.3 : null;

  const results: ResultItem[] = [
    {
      icon: '🏥',
      label: 'Clinic CRM',
      detail: facilities.length > 0 ? `${facilities[0].name} added` : 'No clinics yet',
      completed: facilities.length > 0,
    },
    {
      icon: '📋',
      label: 'Shift Log',
      detail: shifts.length > 0 ? `${shifts.length} shift${shifts.length !== 1 ? 's' : ''} tracked` : 'No shifts yet',
      completed: shifts.length > 0,
    },
    {
      icon: '📄',
      label: 'Invoice',
      detail: draftInvoice ? `$${draftInvoice.total_amount.toLocaleString()} draft ready to send` : 'No invoices yet',
      completed: !!draftInvoice,
    },
    {
      icon: '🧮',
      label: 'Tax Estimate',
      detail: taxEnabled && quarterlyEst
        ? `$${quarterlyEst.toLocaleString(undefined, { maximumFractionDigits: 0 })} quarterly projection`
        : 'Disabled',
      completed: taxEnabled,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <span className="text-2xl">🎉</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">You're all set!</h2>
        <p className="text-muted-foreground">Everything you just entered is working together — your shifts generate invoices, your invoices feed your tax picture.</p>
      </div>

      {/* Result Cards */}
      <div className="space-y-2">
        {results.map((item, i) => (
          <Card
            key={item.label}
            className={`animate-slide-up ${!item.completed ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
          >
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              {item.completed && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
