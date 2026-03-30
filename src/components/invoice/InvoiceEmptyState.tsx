import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Zap, Building2, CalendarDays,
  ArrowRight, DollarSign, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';

const HOW_IT_WORKS = [
  {
    icon: Building2,
    title: 'Set up a practice',
    description: 'Add your clinic with billing cadence (daily, weekly, or monthly).',
  },
  {
    icon: CalendarDays,
    title: 'Book shifts',
    description: 'Add shifts to your schedule with rates — they become invoice line items.',
  },
  {
    icon: Zap,
    title: 'Invoices auto-generate',
    description: 'Draft invoices are created automatically based on your billing cadence.',
  },
  {
    icon: DollarSign,
    title: 'Send & get paid',
    description: 'Review drafts, send to clinics, and track payments in one place.',
  },
];

interface Props {
  onCreateManual: () => void;
}

export function InvoiceEmptyState({ onCreateManual }: Props) {
  const navigate = useNavigate();
  const { facilities, shifts } = useData();

  const hasFacilities = facilities.length > 0;
  const hasShifts = shifts.length > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Invoicing on Autopilot</h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            LocumOps automatically creates invoice drafts from your booked shifts. 
            No more spreadsheets — just review, send, and track payments.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {HOW_IT_WORKS.map((step, i) => (
          <Card key={step.title} className="border-border/50">
            <CardContent className="p-5 flex gap-4">
              <div className="relative">
                <div className="p-2.5 rounded-lg bg-primary/10 h-fit shrink-0">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Smart CTA based on user's current state */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center space-y-4">
          {!hasFacilities ? (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Start by adding a practice</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your first clinic to enable automatic invoice generation.
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => navigate('/facilities')}>
                <Building2 className="h-4 w-4" /> Add your first practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : !hasShifts ? (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Schedule your first shift</h3>
                <p className="text-sm text-muted-foreground">
                  You have {facilities.length} practice{facilities.length > 1 ? 's' : ''} set up. Add a shift and an invoice draft will be created automatically.
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => navigate('/schedule')}>
                <CalendarDays className="h-4 w-4" /> Schedule a shift
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Invoice drafts are on the way</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You have {shifts.length} shift{shifts.length > 1 ? 's' : ''} scheduled. Drafts are generated 
                  automatically based on each practice's billing cadence — check back after your shifts are booked.
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onCreateManual}>
              Or create an invoice manually
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
