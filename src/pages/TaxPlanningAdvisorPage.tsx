import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, BookOpen, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdvisorDisclaimerBanner } from '@/components/tax-advisor/AdvisorDisclaimer';
import { IntakeCard } from '@/components/tax-advisor/IntakeCard';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';
import AskAdvisorTab from '@/components/tax-advisor/AskAdvisorTab';
import GuidanceTab from '@/components/tax-strategy/GuidanceTab';
import OpportunityReviewTab from '@/components/tax-advisor/OpportunityReviewTab';
import MyCPAQuestionsTab from '@/components/tax-advisor/MyCPAQuestionsTab';
import CPAPrepSummaryTab from '@/components/tax-advisor/CPAPrepSummaryTab';
import CPAPacketTab from '@/components/tax-strategy/CPAPacketTab';

export default function TaxPlanningAdvisorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('advisortab') || 'ask';
  const {
    profile, sessions, questions, reviewItems, loading,
    saveProfile, saveSession, saveQuestion, updateQuestion, deleteQuestion, updateReviewItem,
  } = useTaxAdvisor();

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('advisortab', value);
      return next;
    }, { replace: true });
  };

  if (loading) return <p className="text-muted-foreground py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Tax Planning</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Explore locum-specific tax topics, organize your thinking, and prepare smarter CPA questions.
        </p>
      </div>

      <AdvisorDisclaimerBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
              <TabsTrigger value="ask" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Ask Advisor
              </TabsTrigger>
              <TabsTrigger value="guidance" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" />
                Write-Offs & Entity Guide
              </TabsTrigger>
              <TabsTrigger value="cpa-prep" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                CPA Prep
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ask" className="mt-6">
              <AskAdvisorTab profile={profile} sessions={sessions} onSaveSession={saveSession} onSaveQuestion={saveQuestion} />
            </TabsContent>
            <TabsContent value="guidance" className="mt-6">
              <div className="space-y-8">
                <GuidanceTab />
                <OpportunityReviewTab reviewItems={reviewItems} profile={profile} onUpdateItem={updateReviewItem} />
              </div>
            </TabsContent>
            <TabsContent value="cpa-prep" className="mt-6">
              <div className="space-y-8">
                <MyCPAQuestionsTab questions={questions} onSave={saveQuestion} onUpdate={updateQuestion} onDelete={deleteQuestion} />
                <CPAPrepSummaryTab questions={questions} reviewItems={reviewItems} profile={profile} />
                <CPAPacketTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: Intake */}
        <div className="lg:sticky lg:top-4">
          <IntakeCard profile={profile} onSave={saveProfile} />
        </div>
      </div>
    </div>
  );
}
