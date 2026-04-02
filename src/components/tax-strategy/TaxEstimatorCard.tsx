import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  estimateTotalTax,
  FILING_STATUS_LABELS,
  type FilingStatus,
  type TaxEstimate,
  type QuarterlyIncome,
  type SetAsideResult,
} from '@/lib/taxCalculations';

interface TaxEstimatorCardProps {
  grossIncome: number;
  filingStatus: FilingStatus;
  estimatedDeductions: number;
  onFilingStatusChange: (v: FilingStatus) => void;
  onDeductionsChange: (v: number) => void;
  totalReserve: number;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TaxEstimatorCard({
  grossIncome,
  filingStatus,
  estimatedDeductions,
  onFilingStatusChange,
  onDeductionsChange,
  totalReserve,
}: TaxEstimatorCardProps) {
  const estimate = estimateTotalTax(grossIncome, filingStatus, estimatedDeductions);
  const delta = totalReserve - estimate.totalEstimatedTax;
  const deltaAbs = Math.abs(delta);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Tax Estimator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Planning estimate based on your paid invoices. Does not include state taxes, credits, or other income. Confirm with your CPA.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Filing Status</Label>
            <Select value={filingStatus} onValueChange={v => onFilingStatusChange(v as FilingStatus)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(FILING_STATUS_LABELS) as [FilingStatus, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Business Deductions ($)</Label>
            <Input
              type="number"
              min={0}
              className="h-9 text-sm"
              value={estimatedDeductions || ''}
              placeholder="0"
              onChange={e => onDeductionsChange(Number(e.target.value) || 0)}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">e.g. mileage, CE, insurance</p>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ResultItem label="Gross 1099 Income" value={`$${fmt(estimate.grossIncome)}`} />
          <ResultItem label="Business Deductions" value={`−$${fmt(estimate.businessDeductions)}`} muted />
          <ResultItem label="Net Income" value={`$${fmt(estimate.netIncome)}`} />
          <ResultItem label="Self-Employment Tax" value={`$${fmt(estimate.selfEmploymentTax)}`} />
          <ResultItem label="Federal Income Tax" value={`$${fmt(estimate.federalIncomeTax)}`} />
          <ResultItem label="SE Tax Deduction (50%)" value={`−$${fmt(estimate.seTaxDeductibleHalf)}`} muted />
        </div>

        {/* Total + Effective Rate */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Estimated Tax</span>
            <span className="text-lg font-bold">${fmt(estimate.totalEstimatedTax)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Effective Rate</span>
            <span>{estimate.effectiveRate}%</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Per-Quarter Payment</span>
            <span>${fmt(estimate.quarterlyPayment)}</span>
          </div>
        </div>

        {/* Reserve vs Estimate */}
        {totalReserve > 0 && (
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${
            delta >= 0 ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
          }`}>
            {delta > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
            ) : delta < 0 ? (
              <TrendingDown className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <p className={`text-sm ${delta >= 0 ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
              Your reserve (${fmt(totalReserve)}) {delta >= 0 ? 'covers' : 'is under'} the estimate by <span className="font-medium">${fmt(deltaAbs)}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  );
}
