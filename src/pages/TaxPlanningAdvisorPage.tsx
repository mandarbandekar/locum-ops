import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, ClipboardList, HelpCircle, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdvisorDisclaimerBanner } from '@/components/tax-advisor/AdvisorDisclaimer';
import { IntakeCard } from '@/components/tax-advisor/IntakeCard';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';
import AskAdvisorTab from '@/components/tax-advisor/AskAdvisorTab';
import OpportunityReviewTab from '@/components/tax-advisor/OpportunityReviewTab';
import MyCPAQuestionsTab from '@/components/tax-advisor/MyCPAQuestionsTab';
import CPAPrepSummaryTab from '@/components/tax-advisor/CPAPrepSummaryTab';

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
        <h2 className="text-xl font-bold">Tax Planning Advisor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Explore locum-specific tax topics, organize your thinking, and prepare smarter CPA questions.
        </p>
      </div>

      <AdvisorDisclaimerBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
              <TabsTrigger value="ask" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Ask Advisor
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="h-3.5 w-3.5" />
                Opportunity Review
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm">
                <HelpCircle className="h-3.5 w-3.5" />
                My CPA Questions
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                CPA Prep Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ask" className="mt-6">
              <AskAdvisorTab profile={profile} sessions={sessions} onSaveSession={saveSession} onSaveQuestion={saveQuestion} />
            </TabsContent>
            <TabsContent value="review" className="mt-6">
              <OpportunityReviewTab reviewItems={reviewItems} profile={profile} onUpdateItem={updateReviewItem} />
            </TabsContent>
            <TabsContent value="questions" className="mt-6">
              <MyCPAQuestionsTab questions={questions} onSave={saveQuestion} onUpdate={updateQuestion} onDelete={deleteQuestion} />
            </TabsContent>
            <TabsContent value="summary" className="mt-6">
              <CPAPrepSummaryTab questions={questions} reviewItems={reviewItems} profile={profile} />
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
