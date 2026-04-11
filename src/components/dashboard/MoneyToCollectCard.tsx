import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, ArrowRight, TrendingUp, Send, Clock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface InvoiceItem {
  id: string;
  invoice_number: string;
  facility_name: string;
  total_amount: number;
  balance_due: number;
  status: string;
  due_date: string | null;
}

interface MoneyToCollectCardProps {
  outstandingTotal: number;
  paidThisMonth: number;
  invoiceItems: InvoiceItem[];
}

export function MoneyToCollectCard({
  outstandingTotal,
  paidThisMonth,
  invoiceItems,
}: MoneyToCollectCardProps) {
  const navigate = useNavigate();
  const [invoicesOpen, setInvoicesOpen] = useState(false);

  const getIcon = (status: string) => {
    if (status === 'draft') return <FileText className="h-3.5 w-3.5 text-warning" />;
    if (status === 'overdue') return <Clock className="h-3.5 w-3.5 text-destructive" />;
    return <Send className="h-3.5 w-3.5 text-primary" />;
  };

  const getIconBg = (status: string) => {
    if (status === 'draft') return 'bg-warning/10';
    if (status === 'overdue') return 'bg-destructive/10';
    return 'bg-primary/10';
  };

  return (
    <Card className="flex flex-col border-0 shadow-md h-full overflow-hidden">
      <CardContent className="p-0 flex flex-col min-h-0 flex-1">
        {/* Header with total collectable */}
        <div className="px-5 pt-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">To Collect</p>
              <p className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
                ${outstandingTotal.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] mt-2">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">Collected this month:</span>
            <span className="font-bold text-success">${paidThisMonth.toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5 shrink-0" />

        {/* Collapsible Ready to Review */}
        <Collapsible open={invoicesOpen} onOpenChange={setInvoicesOpen} className="flex-1 min-h-0 flex flex-col">
          <CollapsibleTrigger className="px-5 pt-3 pb-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors shrink-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
              Ready to Review
            </p>
            <div className="flex items-center gap-1.5">
              {invoiceItems.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {invoiceItems.length}
                </Badge>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${invoicesOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 min-h-0 overflow-auto">
            <div className="px-4 pb-2">
              {invoiceItems.length === 0 ? (
                <div className="py-3 text-center">
                  <p className="text-[12px] text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {invoiceItems.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <div className={`p-1.5 rounded-md ${getIconBg(inv.status)}`}>
                        {getIcon(inv.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-semibold leading-tight truncate">
                            {inv.invoice_number}
                          </p>
                          <StatusBadge status={inv.status} className="text-[9px] px-1.5 py-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{inv.facility_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold">
                          ${(inv.status === 'draft' ? inv.total_amount : inv.balance_due).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* CTA */}
        <div className="px-4 pt-2 pb-4 shrink-0 mt-auto border-t border-border/50">
          <Button
            variant="outline"
            className="w-full h-9 font-bold text-[12px]"
            onClick={() => navigate('/invoices')}
          >
            Go to Invoicing
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
