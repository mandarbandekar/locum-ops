import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  facilityId: string;
  onSave: (data: { primary_contact_name: string; primary_contact_email: string }) => void;
  compact?: boolean;
}

export function AddSchedulingContactInline({ facilityId, onSave, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSave = () => {
    if (!email.trim()) {
      toast.error('Please enter a contact email');
      return;
    }
    onSave({ primary_contact_name: name.trim(), primary_contact_email: email.trim() });
    setOpen(false);
    setName('');
    setEmail('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
      >
        <UserPlus className="h-3 w-3" /> Add Scheduling Contact
      </button>
    );
  }

  return (
    <div
      className="space-y-2 p-3 rounded-lg border bg-card"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling Contact</p>
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
        <div className="space-y-1">
          <Label className="text-xs">Contact Name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Practice Manager"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contact Email <span className="text-destructive">*</span></Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="manager@clinic.com"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
        >
          <Save className="h-3 w-3 mr-1" /> Save Contact
        </Button>
      </div>
    </div>
  );
}
