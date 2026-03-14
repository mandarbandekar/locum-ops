import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { Facility } from '@/types';
import type { ManualShiftInput } from '@/hooks/useManualSetup';

interface Props {
  facilities: Facility[];
  defaultFacilityId?: string;
  defaultRate?: number;
  onSave: (input: ManualShiftInput) => Promise<any>;
  saving: boolean;
}

export function ManualShiftForm({ facilities, defaultFacilityId, defaultRate, onSave, saving }: Props) {
  const [facilityId, setFacilityId] = useState(defaultFacilityId || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rate, setRate] = useState(defaultRate?.toString() || '');
  const [notes, setNotes] = useState('');

  const canSubmit = facilityId && date && startTime && endTime;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSave({
      facility_id: facilityId,
      date,
      start_time: startTime,
      end_time: endTime,
      rate: rate ? parseFloat(rate) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add your first booked shift</CardTitle>
        <CardDescription>
          Add one upcoming shift so your schedule is ready right away.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Facility</Label>
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
            <SelectContent>
              {facilities.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start time <span className="text-destructive">*</span></Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label>End time <span className="text-destructive">*</span></Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Rate</Label>
          <Input
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            placeholder="e.g. 800"
            min={0}
            step={50}
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
          />
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save shift <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
