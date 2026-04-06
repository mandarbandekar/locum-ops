import { Activity } from 'lucide-react';
import FinancialHealthTab from '@/components/business/FinancialHealthTab';

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Financial Health</h1>
            <p className="page-subtitle">Revenue, cash flow, tax reserve, and expense visibility</p>
          </div>
        </div>
      </div>

      <FinancialHealthTab />
    </div>
  );
}
