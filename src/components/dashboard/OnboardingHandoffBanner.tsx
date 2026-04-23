import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Receipt, ShieldCheck, Building2, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  firstName: string;
  rateCardDone: boolean;
  facilitiesCount: number;
  shiftsCount: number;
  invoiceReadyCount: number;
  onDismiss: () => void;
}

export function OnboardingHandoffBanner({
  firstName,
  rateCardDone,
  facilitiesCount,
  shiftsCount,
  invoiceReadyCount,
  onDismiss,
}: Props) {
  const checklist = [
    { label: 'Rate Card created', done: rateCardDone },
    { label: 'First clinic added', done: facilitiesCount > 0 },
    { label: `Shifts added (${shiftsCount})`, done: shiftsCount > 0 },
    { label: `Invoice workflow prepared${invoiceReadyCount > 0 ? ` (${invoiceReadyCount} draft${invoiceReadyCount === 1 ? '' : 's'})` : ''}`, done: invoiceReadyCount > 0 },
  ];

  return (
    <Card className="border-primary/30 bg-primary/[0.04] relative">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss welcome banner"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="py-5 px-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground font-[Manrope]">
            Welcome to Locum Ops{firstName ? `, ${firstName}` : ''} — your back office is live.
          </h2>
        </div>
        <p className="text-sm text-muted-foreground ml-9 mb-4">
          Here's what we set up together. Pick a next step whenever you're ready.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ml-9">
          {/* Completed checklist */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Setup complete
            </p>
            <ul className="space-y-1.5">
              {checklist.map(item => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      item.done
                        ? 'h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0'
                        : 'h-4 w-4 rounded-full border border-border shrink-0'
                    }
                  >
                    {item.done && <Check className="h-2.5 w-2.5 text-primary" />}
                  </span>
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next actions */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Recommended next
            </p>
            <div className="space-y-2">
              <NextActionLink to="/expenses" icon={Receipt} label="Add an expense" />
              <NextActionLink to="/credentials" icon={ShieldCheck} label="Add a credential" />
              <NextActionLink to="/facilities" icon={Building2} label="Add another clinic" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NextActionLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2 h-9">
      <Link to={to}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-sm">{label}</span>
      </Link>
    </Button>
  );
}
