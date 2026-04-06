import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Car, MapPin, Clock, CheckCircle2, ArrowRight,
  Home, Building2, Zap, X
} from 'lucide-react';

const STEPS = [
  {
    icon: Clock,
    title: 'Shift ends → mileage logged',
    description: 'After each shift, the system auto-calculates the round-trip distance from your home to the clinic and creates a draft mileage expense.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  {
    icon: MapPin,
    title: 'Smart distance calculation',
    description: 'Uses your home address and the clinic\'s address to compute driving miles. Set a fixed override per facility if you prefer.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  {
    icon: Zap,
    title: 'Multi-shift days optimized',
    description: 'Working at two clinics in one day? The tracker chains your route (Home → Clinic A → Clinic B → Home) so you log accurate total miles.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  {
    icon: CheckCircle2,
    title: 'Review & confirm',
    description: 'Every auto-logged entry starts as a draft. Confirm it with one tap, adjust the miles, or dismiss — you\'re always in control.',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
  },
];

interface Props {
  onDismiss: () => void;
}

export function MileageOnboarding({ onDismiss }: Props) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Auto Mileage Tracker</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Never forget to log driving miles again
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground -mt-1 -mr-1" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Visual flow */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
            <ArrowRight className="h-3 w-3" />
            <Building2 className="h-3.5 w-3.5" />
            <span>Clinic</span>
            <ArrowRight className="h-3 w-3" />
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
            <span className="ml-1.5 font-medium text-primary">= auto-logged</span>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-5 pb-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
              <div className={`shrink-0 h-8 w-8 rounded-lg ${step.bg} flex items-center justify-center`}>
                <step.icon className={`h-4 w-4 ${step.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{step.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Setup nudge */}
        <div className="border-t border-border/50 bg-muted/30 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Quick setup:</span>{' '}
            Add your home address in Settings → Profile, and the tracker handles the rest.
          </p>
          <Button size="sm" variant="default" className="gap-1.5 text-xs shrink-0" onClick={onDismiss}>
            Got it
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
