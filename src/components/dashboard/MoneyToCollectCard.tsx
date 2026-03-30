import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, ArrowRight, TrendingUp, Send, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { StatusBadge } from '@/components/StatusBadge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RevenueMonth {
  month: string;
  paid: number;
  outstanding: number;
  anticipated?: number;
}

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
  draftTotal: number;
  paidThisMonth: number;
  revenueData: RevenueMonth[];
  invoiceItems: InvoiceItem[];
}

export function MoneyToCollectCard({
  outstandingTotal,
  draftTotal,
  paidThisMonth,
  revenueData,
  invoiceItems,
}: MoneyToCollectCardProps) {
  const navigate = useNavigate();
  const totalCollectable = outstandingTotal + draftTotal;

  const totalRevenue = useMemo(() => revenueData.reduce((s, d) => s + d.paid + d.outstanding, 0), [revenueData]);

  const totalAnticipated = useMemo(() => revenueData.reduce((s, d) => s + (d.anticipated || 0), 0), [revenueData]);

  const chartConfig = {
    paid: { label: 'Collected', color: 'hsl(var(--success))' },
    outstanding: { label: 'Outstanding', color: 'hsl(var(--warning))' },
    anticipated: { label: 'Anticipated', color: 'hsl(var(--muted-foreground))' },
  };

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
    <Card className="flex flex-col border-0 shadow-md">
      <CardContent className="p-0 flex flex-col min-h-0">
        {/* Header with total collectable */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">To Collect</p>
              <p className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
                ${totalCollectable.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] mt-2">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">Collected this month:</span>
            <span className="font-bold text-success">${paidThisMonth.toLocaleString()}</span>
          </div>
        </div>

        {/* Individual invoice list */}
        <div className="px-4 pt-2 flex-1 min-h-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Invoices to Review ({invoiceItems.length})
          </p>
          <ScrollArea className="h-[180px]">
            <div className="space-y-1.5 pr-2">
              {invoiceItems.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-[12px] text-muted-foreground">All caught up!</p>
                </div>
              )}
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
          </ScrollArea>
        </div>

        {/* Revenue mini chart */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Revenue Trend</p>
            <div className="text-[11px] text-muted-foreground text-right">
              <span>Total: <span className="font-semibold text-foreground">${totalRevenue.toLocaleString()}</span></span>
              {totalAnticipated > 0 && (
                <span className="ml-2">Est: <span className="font-semibold text-muted-foreground">${totalAnticipated.toLocaleString()}</span></span>
              )}
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[90px] w-full">
            <BarChart data={revenueData} barGap={0} barCategoryGap="20%">
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-[11px]">
                      <p className="font-semibold mb-1">{label}</p>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
                          <span className="text-muted-foreground">{p.dataKey === 'paid' ? 'Collected' : 'Outstanding'}:</span>
                          <span className="font-medium">${p.value?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="paid" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outstanding" stackId="a" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="anticipated" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} fillOpacity={0.4} strokeDasharray="4 2" stroke="hsl(var(--muted-foreground))" />
            </BarChart>
          </ChartContainer>
        </div>

        {/* CTA */}
        <div className="px-4 pt-1 pb-4 mt-auto">
          <Button
            variant="outline"
            className="w-full h-9 font-semibold text-[12px]"
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
