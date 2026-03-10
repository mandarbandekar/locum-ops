import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calculator } from 'lucide-react';
import ReportsPage from '@/pages/ReportsPage';
import TaxStrategyPage from '@/pages/TaxStrategyPage';
import { useSearchParams } from 'react-router-dom';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [primaryTab, setPrimaryTab] = useState<'reports' | 'taxes'>(
    tabParam === 'taxes' ? 'taxes' : 'reports'
  );

  const handlePrimaryTab = (tab: 'reports' | 'taxes') => {
    setPrimaryTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Page header matching Credentials style */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Business</h1>
            <p className="text-sm text-muted-foreground">Reports, analytics, and tax planning</p>
          </div>
        </div>
      </div>

      {/* Primary 2-tab selector matching Credentials pattern */}
      <div className="flex gap-3">
        <button
          onClick={() => handlePrimaryTab('reports')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            primaryTab === 'reports'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          Reports
        </button>
        <button
          onClick={() => handlePrimaryTab('taxes')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex-1 sm:flex-none ${
            primaryTab === 'taxes'
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
          }`}
        >
          <Calculator className="h-5 w-5" />
          Taxes
        </button>
      </div>

      {/* Reports section */}
      {primaryTab === 'reports' && <ReportsPage />}

      {/* Taxes section */}
      {primaryTab === 'taxes' && <TaxStrategyPage embedded />}
    </div>
  );
}
