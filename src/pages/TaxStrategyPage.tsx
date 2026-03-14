import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, BarChart3, Folder, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { TaxDisclaimerBanner } from '@/components/tax-strategy/TaxDisclaimer';
import GuidanceTab from '@/components/tax-strategy/GuidanceTab';
import TrackerTab from '@/components/tax-strategy/TrackerTab';
import DeductionsTab from '@/components/tax-strategy/DeductionsTab';
import CPAPacketTab from '@/components/tax-strategy/CPAPacketTab';

export default function TaxStrategyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('subtab') || 'tracker';

  const handleSubTabChange = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('subtab', value);
      return next;
    }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <TaxDisclaimerBanner />

      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="tracker" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Tracker
          </TabsTrigger>
          <TabsTrigger value="guidance" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            Guidance
          </TabsTrigger>
          <TabsTrigger value="deductions" className="gap-1.5 text-xs sm:text-sm">
            <Folder className="h-3.5 w-3.5" />
            Deductions
          </TabsTrigger>
          <TabsTrigger value="cpa-packet" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            CPA Packet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="mt-6">
          <TrackerTab />
        </TabsContent>
        <TabsContent value="guidance" className="mt-6">
          <GuidanceTab />
        </TabsContent>
        <TabsContent value="deductions" className="mt-6">
          <DeductionsTab />
        </TabsContent>
        <TabsContent value="cpa-packet" className="mt-6">
          <CPAPacketTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
