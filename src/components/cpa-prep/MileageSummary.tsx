import { Car } from 'lucide-react';
import type { MileageSummary as MileageData } from '@/hooks/useCPAPrepData';

const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

interface Props { data: MileageData }

export default function MileageSummary({ data }: Props) {
  if (data.totalMiles === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No mileage tracked yet. Log commute miles in the Expense Tracker to see your travel deduction.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Car className="h-5 w-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
          <p className="text-2xl font-bold">{Math.round(data.totalMiles).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">business miles YTD</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(data.deductionCents)}</p>
          <p className="text-xs text-muted-foreground">mileage deduction (IRS rate)</p>
        </div>
      </div>
      {data.byClinic.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Miles by Clinic</p>
          <div className="space-y-1">
            {data.byClinic.slice(0, 8).map(c => (
              <div key={c.name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{c.name}</span>
                <span className="font-medium">{Math.round(c.miles).toLocaleString()} mi</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
