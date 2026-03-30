import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2, CalendarDays, FileText, DollarSign, ShieldCheck,
  CheckCircle2, Circle, ArrowRight, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useCredentials } from '@/hooks/useCredentials';

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  action: () => void;
  actionLabel: string;
}

interface Props {
  onDismiss: () => void;
}

export function GettingStartedChecklist({ onDismiss }: Props) {
  const navigate = useNavigate();
  const { facilities, shifts, invoices, payments } = useData();
  const { credentials } = useCredentials();

  const steps: ChecklistStep[] = useMemo(() => [
    {
      key: 'facility',
      label: 'Add your first practice',
      description: 'Set up a clinic with billing preferences and contacts.',
      icon: Building2,
      done: facilities.length > 0,
      action: () => navigate('/facilities'),
      actionLabel: 'Add practice',
    },
    {
      key: 'shift',
      label: 'Schedule a shift',
      description: 'Add an upcoming shift — invoices are auto-generated from booked shifts.',
      icon: CalendarDays,
      done: shifts.length > 0,
      action: () => navigate('/schedule'),
      actionLabel: 'Add shift',
    },
    {
      key: 'invoice',
      label: 'Review your first invoice',
      description: 'Drafts are created automatically. Review and send to your clinic.',
      icon: FileText,
      done: invoices.length > 0,
      action: () => navigate('/invoices'),
      actionLabel: 'View invoices',
    },
    {
      key: 'payment',
      label: 'Record a payment',
      description: 'Track when you get paid to stay on top of your revenue.',
      icon: DollarSign,
      done: payments.length > 0,
      action: () => navigate('/invoices'),
      actionLabel: 'Record payment',
    },
    {
      key: 'credential',
      label: 'Add a credential',
      description: 'Track your licenses, DEA, and insurance with renewal alerts.',
      icon: ShieldCheck,
      done: (credentials?.length || 0) > 0,
      action: () => navigate('/credentials'),
      actionLabel: 'Set up credentials',
    },
  ], [facilities, shifts, invoices, payments, credentials, navigate]);

  const completedCount = steps.filter(s => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Don't render if all done
  if (completedCount === steps.length) return null;

  // Find next incomplete step
  const nextStep = steps.find(s => !s.done);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground">Get started with LocumOps</h3>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {steps.length} steps completed
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground -mt-1 -mr-1"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                step.done
                  ? 'opacity-60'
                  : step === nextStep
                  ? 'bg-primary/5 border border-primary/15'
                  : ''
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {step.label}
                </p>
                {!step.done && step === nextStep && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
              {!step.done && step === nextStep && (
                <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={step.action}>
                  {step.actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
