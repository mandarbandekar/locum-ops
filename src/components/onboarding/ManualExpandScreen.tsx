import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CalendarDays, Check, Plus } from 'lucide-react';
import type { Facility, Shift } from '@/types';

interface Props {
  facilities: Facility[];
  shifts: Shift[];
  onAddPractice: () => void;
  onAddShift: () => void;
  onFinish: () => void;
}

export function ManualExpandScreen({ facilities, shifts, onAddPractice, onAddShift, onFinish }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Your workspace is taking shape</h1>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-foreground">
              {facilities.length} practice{facilities.length !== 1 ? 's' : ''} added
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-foreground">
              {shifts.length} shift{shifts.length !== 1 ? 's' : ''} added
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start h-auto py-3 px-4" onClick={onAddPractice}>
          <Plus className="mr-2 h-4 w-4" />
          <Building2 className="mr-2 h-4 w-4 text-primary" />
          Add another practice
        </Button>
        <Button variant="outline" className="w-full justify-start h-auto py-3 px-4" onClick={onAddShift}>
          <Plus className="mr-2 h-4 w-4" />
          <CalendarDays className="mr-2 h-4 w-4 text-primary" />
          Add another shift
        </Button>
        <Button onClick={onFinish} className="w-full mt-2">
          Finish setup
        </Button>
      </div>
    </div>
  );
}
