import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import TaxTerm from './TaxTerm';

interface Props {
  currentQuarterlyPayment: number;
  onIncomeChange: (additionalIncome: number) => number; // returns new quarterly payment
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function WhatIfSlider({ currentQuarterlyPayment, onIncomeChange }: Props) {
  const [extra, setExtra] = useState(0);
  const newPayment = extra > 0 ? onIncomeChange(extra) : currentQuarterlyPayment;
  const diff = newPayment - currentQuarterlyPayment;

  return (
    <Card className="border-dashed border-primary/30">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">What if I add more shifts this quarter?</span>
        </div>
        <div className="px-1">
          <Slider
            value={[extra]}
            onValueChange={v => setExtra(v[0])}
            min={0}
            max={30000}
            step={1000}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span className="font-medium text-foreground">+{fmt(extra)}</span>
            <span>$30,000</span>
          </div>
        </div>
        {extra > 0 && (
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">New <TaxTerm term="quarterly_payment">quarterly payment</TaxTerm></span>
            <div className="text-right">
              <span className="font-semibold">{fmt(newPayment)}</span>
              <span className="text-xs text-destructive ml-2">(+{fmt(diff)})</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
