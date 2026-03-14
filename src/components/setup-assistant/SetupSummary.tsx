import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, FileText, CalendarDays, LayoutDashboard, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SetupSummary as SetupSummaryType } from '@/hooks/useSetupAssistant';

interface SetupSummaryProps {
  summary: SetupSummaryType;
}

export function SetupSummary({ summary }: SetupSummaryProps) {
  const navigate = useNavigate();

  const stats = [
    { icon: Building2, label: 'facilities imported', count: summary.facilities_imported },
    { icon: FileText, label: 'contracts added', count: summary.contracts_added },
    { icon: CalendarDays, label: 'shifts imported', count: summary.shifts_imported },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
        <p className="text-muted-foreground text-sm">Your workspace is ready to go.</p>
      </div>

      {stats.length > 0 && (
        <Card>
          <CardContent className="py-5 space-y-3">
            {stats.map(({ icon: Icon, label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{count}</span> {label}
                </span>
              </div>
            ))}
            {summary.items_need_review > 0 && (
              <div className="flex items-center gap-3 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  <span className="font-semibold">{summary.items_need_review}</span> items still need review
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {summary.facilities_imported > 0 && (
          <Button variant="outline" className="w-full justify-start h-auto py-3 px-5" onClick={() => navigate('/facilities')}>
            <Building2 className="mr-3 h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Review Facilities</span>
          </Button>
        )}
        {summary.shifts_imported > 0 && (
          <Button variant="outline" className="w-full justify-start h-auto py-3 px-5" onClick={() => navigate('/schedule')}>
            <CalendarDays className="mr-3 h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Review Schedule</span>
          </Button>
        )}
        {summary.contracts_added > 0 && (
          <Button variant="outline" className="w-full justify-start h-auto py-3 px-5" onClick={() => navigate('/facilities')}>
            <FileText className="mr-3 h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Review Contracts</span>
          </Button>
        )}
        <Button className="w-full justify-start h-auto py-3 px-5" onClick={() => navigate('/')}>
          <LayoutDashboard className="mr-3 h-5 w-5" />
          <span className="text-sm font-medium">Go to Dashboard</span>
        </Button>
      </div>
    </div>
  );
}
