import { ClipboardCheck } from 'lucide-react';

interface EmptyDashboardPromptProps {
  onAddClinic: () => void;
}

export function EmptyDashboardPrompt({ onAddClinic }: EmptyDashboardPromptProps) {
  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-lg border border-border-subtle shadow-sm p-8 text-center">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-4" style={{ color: '#1A5C6B' }} />
        <h2
          className="font-semibold text-foreground"
          style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '22px' }}
        >
          Let's set up your relief business
        </h2>
        <p className="text-[15px] mt-2" style={{ color: '#6B7280' }}>
          Add your first clinic and shift to start tracking your earnings, invoices, and tax estimates.
        </p>
        <button
          type="button"
          onClick={onAddClinic}
          className="mt-6 inline-flex items-center justify-center font-semibold text-white rounded-lg transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: '#1A5C6B',
            padding: '12px 24px',
            fontSize: '14px',
          }}
        >
          Add Your First Clinic →
        </button>
      </div>
    </div>
  );
}
