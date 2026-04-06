import { Activity, Heart, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import FinancialHealthTab from '@/components/business/FinancialHealthTab';
import PerformanceInsightsTab from '@/components/business/PerformanceInsightsTab';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'financial-health';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">Relief Business Hub</h1>
            <p className="page-subtitle">Your relief practice at a glance</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSearchParams({ tab: 'financial-health' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'financial-health' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Financial Health</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'performance' }, { replace: true })}
          className={`primary-tab-btn ${activeTab === 'performance' ? 'primary-tab-btn--active' : 'primary-tab-btn--inactive'}`}
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm">Performance Insights</span>
        </button>
      </div>

      {activeTab === 'financial-health' && <FinancialHealthTab />}
      {activeTab === 'performance' && <PerformanceInsightsTab />}
    </div>
  );
}
