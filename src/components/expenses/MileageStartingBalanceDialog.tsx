import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMiles: number;
  initialNote: string;
  taxYear: number;
  onSave: (miles: number, note: string) => Promise<void> | void;
}

export default function MileageStartingBalanceDialog({
  open, onOpenChange, initialMiles, initialNote, taxYear, onSave,
}: Props) {
  const [miles, setMiles] = useState(String(initialMiles || ''));
  const [note, setNote] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMiles(initialMiles ? String(initialMiles) : '');
      setNote(initialNote || '');
    }
  }, [open, initialMiles, initialNote]);

  const parsed = Number(miles);
  const valid = miles === '' || (Number.isFinite(parsed) && parsed >= 0);

  const submit = async (value: number) => {
    setSaving(true);
    try {
      await onSave(value, note.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>YTD starting balance</DialogTitle>
          <DialogDescription>
            Add miles you've already tracked elsewhere this year. We'll add them to your YTD totals — they won't appear in your confirmed mileage log or per-clinic breakdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="starting-miles">Miles already tracked in {taxYear}</Label>
            <Input
              id="starting-miles"
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              placeholder="e.g. 1240"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
            />
            {!valid && <p className="text-xs text-destructive">Enter a number of 0 or greater.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="starting-note">Source / note (optional)</Label>
            <Input
              id="starting-note"
              type="text"
              placeholder="e.g. From MileIQ Jan–Apr"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {initialMiles > 0 && (
            <Button
              variant="ghost"
              onClick={() => submit(0)}
              disabled={saving}
              className="mr-auto text-muted-foreground"
            >
              Clear
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => submit(parsed || 0)}
            disabled={!valid || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
