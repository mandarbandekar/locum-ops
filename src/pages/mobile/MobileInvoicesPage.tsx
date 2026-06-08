import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, ChevronRight } from 'lucide-react';
import { computeInvoiceStatus } from '@/lib/businessLogic';

const STATUS_ORDER: Array<'overdue' | 'sent' | 'partial' | 'draft' | 'paid'> = [
  'overdue', 'sent', 'partial', 'draft', 'paid',
];
const STATUS_LABEL: Record<string, string> = {
  overdue: 'Overdue', sent: 'Sent', partial: 'Partially paid', draft: 'Draft', paid: 'Paid',
};

export default function MobileInvoicesPage() {
  const { invoices, facilities } = useData();

  const grouped = useMemo(() => {
    const map: Record<string, typeof invoices> = {};
    invoices.forEach(i => {
      const s = computeInvoiceStatus(i);
      (map[s] ||= []).push(i);
    });
    Object.values(map).forEach(list => list.sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || '')));
    return map;
  }, [invoices]);

  return (
    <div className="space-y-5">
      {STATUS_ORDER.every(s => !(grouped[s]?.length)) && (
        <Card className="p-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No invoices yet</p>
        </Card>
      )}
      {STATUS_ORDER.map(status => {
        const list = grouped[status] || [];
        if (list.length === 0) return null;
        return (
          <section key={status}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1 flex items-center justify-between">
              <span>{STATUS_LABEL[status]}</span>
              <span className="text-muted-foreground/70">{list.length}</span>
            </h3>
            <div className="space-y-2">
              {list.map(inv => {
                const f = facilities.find(x => x.id === inv.facility_id);
                return (
                  <Link key={inv.id} to={`/invoices/${inv.id}`}>
                    <Card className="p-3 active:bg-accent flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{f?.name || 'Clinic'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.invoice_number} · ${Number(inv.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}
                        className="shrink-0 capitalize"
                      >
                        {status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
