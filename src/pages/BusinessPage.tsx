import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calculator, Landmark } from 'lucide-react';
import ReportsPage from '@/pages/ReportsPage';
import TaxesPage from '@/pages/TaxesPage';
import TaxStrategyPage from '@/pages/TaxStrategyPage';
import { useSearchParams } from 'react-router-dom';

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reports';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Business</h1>
        <p className="text-muted-foreground mt-1">Reports, analytics, and tax planning</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="taxes" className="gap-2">
            <Calculator className="h-4 w-4" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="tax-strategy" className="gap-2">
            <Landmark className="h-4 w-4" />
            Taxes & Finance Ops
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <ReportsPage />
        </TabsContent>

        <TabsContent value="taxes" className="mt-6">
          <TaxesPage />
        </TabsContent>

        <TabsContent value="tax-strategy" className="mt-6">
          <TaxStrategyPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
