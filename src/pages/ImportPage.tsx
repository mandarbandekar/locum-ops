import { useState } from 'react';
import { SetupAssistantLanes } from '@/components/setup-assistant/SetupAssistantLanes';
import { ImportReviewPanel } from '@/components/setup-assistant/ImportReviewPanel';
import { SetupSummary } from '@/components/setup-assistant/SetupSummary';
import { useSetupAssistant } from '@/hooks/useSetupAssistant';
import { useNavigate } from 'react-router-dom';

export default function ImportPage() {
  const setupAssistant = useSetupAssistant();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lanes' | 'review' | 'summary'>('lanes');

  if (phase === 'review') {
    return (
      <div className="max-w-lg mx-auto py-8">
        <ImportReviewPanel
          entities={setupAssistant.entities}
          onUpdateEntity={setupAssistant.updateEntityStatus}
          onBulkConfirm={setupAssistant.bulkConfirm}
          onComplete={() => {
            const summary = setupAssistant.getSummary();
            if (summary.facilities_imported > 0 || summary.contracts_added > 0 || summary.shifts_imported > 0) {
              setPhase('summary');
            } else {
              navigate('/');
            }
          }}
          onBack={() => setPhase('lanes')}
        />
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="max-w-lg mx-auto py-8">
        <SetupSummary summary={setupAssistant.getSummary()} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <SetupAssistantLanes
        onComplete={() => setPhase('review')}
        onSkip={() => navigate('/')}
        hookState={setupAssistant}
      />
    </div>
  );
}
