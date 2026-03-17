import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5 px-3.5" onClick={() => navigate('/schedule')}>
        <Plus className="h-3.5 w-3.5" /> Shift
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5 px-3.5" onClick={() => navigate('/invoices')}>
        <Plus className="h-3.5 w-3.5" /> Invoice
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5 px-3.5" onClick={() => navigate('/credentials?tab=ce')}>
        <Plus className="h-3.5 w-3.5" /> CE Entry
      </Button>
    </div>
  );
}
