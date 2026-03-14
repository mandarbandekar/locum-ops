import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, LayoutDashboard, CalendarDays, Building2 } from 'lucide-react';

interface Props {
  facilitiesCount: number;
  shiftsCount: number;
  onNavigate: (path: string) => void;
}

export function WorkspaceReady({ facilitiesCount, shiftsCount, onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Your workspace is ready!</h1>
        <p className="text-muted-foreground">Here's what's set up for you.</p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          {facilitiesCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>{facilitiesCount} practice{facilitiesCount !== 1 ? 's' : ''} added</span>
            </div>
          )}
          {shiftsCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>{shiftsCount} shift{shiftsCount !== 1 ? 's' : ''} added</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button className="w-full justify-start h-auto py-4 px-5" onClick={() => onNavigate('/')}>
          <LayoutDashboard className="mr-3 h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Go to Dashboard</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => onNavigate('/schedule')}>
          <CalendarDays className="mr-3 h-5 w-5 text-primary" />
          <div className="text-left">
            <div className="font-medium">Review Schedule</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full justify-start h-auto py-4 px-5" onClick={() => onNavigate('/facilities')}>
          <Building2 className="mr-3 h-5 w-5 text-primary" />
          <div className="text-left">
            <div className="font-medium">Review Facilities</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
