import { useState } from 'react';
import { SetupAssistantLanes } from '@/components/setup-assistant/SetupAssistantLanes';
import { ImportReviewPanel } from '@/components/setup-assistant/ImportReviewPanel';
import { SetupSummary } from '@/components/setup-assistant/SetupSummary';
import { useSetupAssistant } from '@/hooks/useSetupAssistant';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ImportPage() {
  const setupAssistant = useSetupAssistant();
  const { addFacility, addContact, updateTerms, addShift } = useData();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'lanes' | 'review' | 'summary'>('lanes');

  const handleFinishSetup = async () => {
    const summary = setupAssistant.getSummary();
    if (summary.facilities_imported > 0 || summary.contracts_added > 0 || summary.shifts_imported > 0) {
      try {
        await setupAssistant.materializeConfirmed(addFacility, addContact, updateTerms, addShift);
        toast.success('Import complete — data added to your workspace');
      } catch (err) {
        console.error('Materialization error:', err);
        toast.error('Some items failed to import');
      }
      setPhase('summary');
    } else {
      navigate('/');
    }
  };

  if (phase === 'review') {
    return (
      <div className="max-w-lg mx-auto py-8">
        <ImportReviewPanel
          entities={setupAssistant.entities}
          onUpdateEntity={setupAssistant.updateEntityStatus}
          onBulkConfirm={setupAssistant.bulkConfirm}
          onComplete={handleFinishSetup}
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
