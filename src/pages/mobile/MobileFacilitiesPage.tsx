import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, ChevronRight } from 'lucide-react';

export default function MobileFacilitiesPage() {
  const { facilities } = useData();
  const [q, setQ] = useState('');

  const active = useMemo(() => {
    return facilities
      .filter(f => f.status !== 'archived')
      .filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()) || (f.address || '').toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, q]);

  return (
    <div className="space-y-3">
      <div className="sticky top-14 -mx-4 px-4 pt-2 pb-3 bg-background z-20 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search clinics"
            className="pl-9 h-11"
          />
        </div>
      </div>

      {active.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No clinics found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {active.map(f => (
            <Link key={f.id} to={`/facilities/${f.id}`}>
              <Card className="p-3 active:bg-accent flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{f.name}</p>
                    {f.generates_invoices === false && (
                      <Badge variant="outline" className="text-[10px]">Direct</Badge>
                    )}
                  </div>
                  {f.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1 truncate">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">{f.address}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
