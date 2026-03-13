import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/schedule')}>
        <Plus className="h-3 w-3" /> Shift
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/invoices')}>
        <Plus className="h-3 w-3" /> Invoice
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/credentials?tab=ce')}>
        <Plus className="h-3 w-3" /> CE Entry
      </Button>
    </div>
  );
}
