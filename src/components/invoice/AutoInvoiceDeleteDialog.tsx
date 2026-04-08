import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldOff } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  facilityName: string;
  onDeleteOnly: () => void;
  onDeleteAndSuppress: () => void;
}

export function AutoInvoiceDeleteDialog({ open, onOpenChange, invoiceNumber, facilityName, onDeleteOnly, onDeleteAndSuppress }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDeleteOnly = async () => {
    setLoading(true);
    await onDeleteOnly();
    setLoading(false);
    onOpenChange(false);
  };

  const handleDeleteAndSuppress = async () => {
    setLoading(true);
    await onDeleteAndSuppress();
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Delete Auto-Generated Invoice?
          </DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <span className="block">
              <strong>{invoiceNumber}</strong> for <strong>{facilityName}</strong> was auto-generated from your shifts.
            </span>
            <span className="block">
              If you only delete it, it may be recreated automatically when new shifts are added or the system runs its next check. To prevent that, you can also suppress auto-generation for this billing period.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            onClick={handleDeleteAndSuppress}
            disabled={loading}
            className="w-full gap-2"
          >
            <ShieldOff className="h-4 w-4" />
            Delete & Don't Recreate
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteOnly}
            disabled={loading}
            className="w-full"
          >
            Delete Only
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
