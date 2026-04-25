import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { ArrowRight, DollarSign, Loader2 } from 'lucide-react';
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
  const [facilityId, setFacilityId] = useState(defaultFacilityId || facilities[0]?.id || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');

  const rateNum = parseFloat(rate);
  const rateIsValid = !Number.isNaN(rateNum) && rateNum > 0;
  const canSubmit = !!facilityId && !!date && !!startTime && !!endTime && rateIsValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSave({
      facility_id: facilityId,
      date,
      start_time: startTime,
      end_time: endTime,
      rate: rateNum,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">Add your first shift</h2>
        <p className="text-muted-foreground mt-1">
          Add an upcoming shift so your schedule is ready right away.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Practice</Label>
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger><SelectValue placeholder="Select practice" /></SelectTrigger>
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
            <TimePicker value={startTime} onChange={setStartTime} placeholder="Select start" label="Start time" />
          </div>
          <div>
            <Label>End time <span className="text-destructive">*</span></Label>
            <TimePicker value={endTime} onChange={setEndTime} placeholder="Select end" relativeToStart={startTime || undefined} label="End time" />
          </div>
        </div>

        <div>
          <Label>Rate <span className="text-destructive">*</span></Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="e.g. 800"
              className="pl-7"
              min={0}
              step={50}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="w-full" size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save shift <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
