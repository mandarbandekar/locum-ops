import { FileText } from 'lucide-react';
import CPAPrepTab from '@/components/business/CPAPrepTab';
import { useTaxAdvisor } from '@/hooks/useTaxAdvisor';

export default function CPAPrepPage() {
  const {
    profile, questions, reviewItems, loading,
    saveProfile, saveQuestion, updateQuestion, deleteQuestion, updateReviewItem,
  } = useTaxAdvisor();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="page-title">CPA Prep</h1>
            <p className="page-subtitle">Quarterly tax prep dashboard for your CPA meetings</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <CPAPrepTab
          profile={profile}
          questions={questions}
          reviewItems={reviewItems}
          onSaveProfile={saveProfile}
          onSaveQuestion={saveQuestion}
          onUpdateQuestion={updateQuestion}
          onDeleteQuestion={deleteQuestion}
          onUpdateReviewItem={updateReviewItem}
        />
      )}
    </div>
  );
}
