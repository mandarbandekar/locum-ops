import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, ArrowRight, TrendingUp, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueMonth {
  month: string;
  paid: number;
  outstanding: number;
}

interface MoneyToCollectCardProps {
  outstandingTotal: number;
  unpaidCount: number;
  draftTotal: number;
  draftCount: number;
  paidThisMonth: number;
  revenueData: RevenueMonth[];
}

export function MoneyToCollectCard({
  outstandingTotal,
  unpaidCount,
  draftTotal,
  draftCount,
  paidThisMonth,
  revenueData,
}: MoneyToCollectCardProps) {
  const navigate = useNavigate();
  const totalCollectable = outstandingTotal + draftTotal;

  const totalRevenue = useMemo(() => revenueData.reduce((s, d) => s + d.paid + d.outstanding, 0), [revenueData]);

  const chartConfig = {
    paid: { label: 'Collected', color: 'hsl(var(--success))' },
    outstanding: { label: 'Outstanding', color: 'hsl(var(--warning))' },
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-md">
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Header with total collectable */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
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
        </div>

        {/* Breakdown items */}
        <div className="px-4 space-y-1.5">
          {draftCount > 0 && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-1.5 rounded-md bg-warning/10">
                <FileText className="h-3.5 w-3.5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight">
                  {draftCount} draft{draftCount > 1 ? 's' : ''} ready
                </p>
                <p className="text-[11px] text-muted-foreground">${draftTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}

          {unpaidCount > 0 && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => navigate('/invoices')}
            >
              <div className="p-1.5 rounded-md bg-primary/10">
                <Send className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight">
                  {unpaidCount} awaiting payment
                </p>
                <p className="text-[11px] text-muted-foreground">${outstandingTotal.toLocaleString()}</p>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}

          {totalCollectable === 0 && (
            <div className="py-3 text-center">
              <p className="text-[12px] text-muted-foreground">All caught up!</p>
            </div>
          )}
        </div>

        {/* Collected this month */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 text-[12px]">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">This month:</span>
            <span className="font-bold text-success">${paidThisMonth.toLocaleString()}</span>
          </div>
        </div>

        {/* Revenue mini chart */}
        <div className="px-4 pt-4 flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Revenue Trend</p>
            <p className="text-[11px] text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${totalRevenue.toLocaleString()}</span>
            </p>
          </div>
          <ChartContainer config={chartConfig} className="h-[120px] w-full">
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
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: p.fill }}
                          />
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
            </BarChart>
          </ChartContainer>
        </div>

        {/* CTA */}
        <div className="px-4 pt-2 pb-4 mt-auto">
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
