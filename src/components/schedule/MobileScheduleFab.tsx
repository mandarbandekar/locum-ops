import { useState } from 'react';
import { Plus, X, CalendarPlus, Ban, CalendarCheck2 } from 'lucide-react';

interface MobileScheduleFabProps {
  onAddShift: () => void;
  onBlockTime: () => void;
  onJumpToToday: () => void;
}

export function MobileScheduleFab({ onAddShift, onBlockTime, onJumpToToday }: MobileScheduleFabProps) {
  const [open, setOpen] = useState(false);

  const items = [
    { label: 'Add Shift', icon: CalendarPlus, onClick: () => { setOpen(false); onAddShift(); } },
    { label: 'Block Time', icon: Ban, onClick: () => { setOpen(false); onBlockTime(); } },
    { label: 'Jump to Today', icon: CalendarCheck2, onClick: () => { setOpen(false); onJumpToToday(); } },
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
