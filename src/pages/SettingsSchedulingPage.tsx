import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function SettingsSchedulingPage() {
  const [weekStart, setWeekStart] = useState('monday');
  const [defaultView, setDefaultView] = useState('week');
  const [preventAutoToday, setPreventAutoToday] = useState(true);

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Scheduling</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Defaults for creating and viewing shifts. Changes save automatically.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Calendar Display</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Week starts on</Label>
                <Select value={weekStart} onValueChange={setWeekStart}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default view</Label>
                <Select value={defaultView} onValueChange={setDefaultView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Safe Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Don't auto-select today in multi-date scheduling</span>
                <p className="text-xs text-muted-foreground mt-0.5">Prevents accidental same-day shift creation.</p>
              </div>
              <Switch checked={preventAutoToday} onCheckedChange={setPreventAutoToday} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
