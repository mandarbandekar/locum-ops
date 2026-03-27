import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
      <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 px-3 font-medium border-border/60 flex-1 sm:flex-none" onClick={() => navigate('/schedule')}>
        <Plus className="h-3 w-3" /> Shift
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 px-3 font-medium border-border/60 flex-1 sm:flex-none" onClick={() => navigate('/invoices')}>
        <Plus className="h-3 w-3" /> Invoice
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 px-3 font-medium border-border/60 flex-1 sm:flex-none" onClick={() => navigate('/credentials?tab=ce')}>
        <Plus className="h-3 w-3" /> CE Entry
      </Button>
    </div>
  );
}
