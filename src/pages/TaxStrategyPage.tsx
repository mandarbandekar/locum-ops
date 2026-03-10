import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, BarChart3, Receipt, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { TaxDisclaimer } from '@/components/tax-strategy/TaxDisclaimer';
import { GuidanceTab } from '@/components/tax-strategy/GuidanceTab';
import { TrackerTab } from '@/components/tax-strategy/TrackerTab';
import { DeductionsTab } from '@/components/tax-strategy/DeductionsTab';
import { CPAPacketTab } from '@/components/tax-strategy/CPAPacketTab';
import { useTaxStrategy } from '@/hooks/useTaxStrategy';

export default function TaxStrategyPage({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localTab, setLocalTab] = useState('guidance');
  const activeTab = embedded ? localTab : (searchParams.get('tab') || 'guidance');
  const taxStrategy = useTaxStrategy();

  const handleTabChange = (value: string) => {
    if (embedded) {
      setLocalTab(value);
    } else {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  if (taxStrategy.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tax Strategy</h1>
        <p className="text-muted-foreground mt-1">Educational tools, organization, and CPA preparation</p>
      </div>

      <TaxDisclaimer />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="guidance" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Guidance
          </TabsTrigger>
          <TabsTrigger value="tracker" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Tracker
          </TabsTrigger>
          <TabsTrigger value="deductions" className="gap-2">
            <Receipt className="h-4 w-4" />
            Deductions
          </TabsTrigger>
          <TabsTrigger value="cpa-packet" className="gap-2">
            <FileText className="h-4 w-4" />
            CPA Packet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guidance" className="mt-6">
          <GuidanceTab data={taxStrategy} />
        </TabsContent>
        <TabsContent value="tracker" className="mt-6">
          <TrackerTab data={taxStrategy} />
        </TabsContent>
        <TabsContent value="deductions" className="mt-6">
          <DeductionsTab data={taxStrategy} />
        </TabsContent>
        <TabsContent value="cpa-packet" className="mt-6">
          <CPAPacketTab data={taxStrategy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
