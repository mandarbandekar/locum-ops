import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarPlus, Building2, CheckCircle2, X } from 'lucide-react';

interface MobileQuickActionsFabProps {
  onAddShift: () => void;
  onAddClinic: () => void;
}

export function MobileQuickActionsFab({ onAddShift, onAddClinic }: MobileQuickActionsFabProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    {
      label: 'Add Shift',
      icon: CalendarPlus,
      onClick: () => { setOpen(false); onAddShift(); },
    },
    {
      label: 'Add Clinic',
      icon: Building2,
      onClick: () => { setOpen(false); onAddClinic(); },
    },
    {
      label: 'Mark Invoice Paid',
      icon: CheckCircle2,
      onClick: () => { setOpen(false); navigate('/invoices?filter=sent'); },
    },
  ];

  return (
    <div className="md:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/40 animate-in fade-in duration-150"
        />
      )}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {open && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {items.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex items-center gap-2 rounded-full bg-card border border-border pl-3 pr-4 py-2 shadow-md text-[13px] font-medium text-foreground"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          onClick={() => setOpen(v => !v)}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          {open ? <X className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
