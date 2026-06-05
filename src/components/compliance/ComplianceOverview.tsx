import { useComplianceData, type ComplianceAlert } from '@/hooks/useComplianceData';
import { getSeverityColor, getSeverityBg } from '@/lib/complianceReadiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, FileX, GraduationCap,
  Upload, RefreshCw, Eye, Link2, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComplianceSetupChecklist } from '@/components/compliance/onboarding/ComplianceSetupChecklist';
import { ComplianceEmptyState } from '@/components/compliance/onboarding/ComplianceEmptyState';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  action: string;
}

interface Props {
  onNavigate: (tab: string) => void;
  checklistItems?: ChecklistItem[];
  onChecklistAction?: (action: string) => void;
  showChecklist?: boolean;
  credentialCount?: number;
  onStartOnboarding?: () => void;
  onAddCredential?: () => void;
  onUploadDocument?: () => void;
  onAddCE?: () => void;
}

export function ComplianceOverview({ onNavigate, checklistItems, onChecklistAction, showChecklist, credentialCount, onStartOnboarding, onAddCredential, onUploadDocument, onAddCE }: Props) {
  const { summary, alerts, isLoading } = useComplianceData();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading compliance data…</p></div>;
  }

  // Show empty state if no credentials
  if ((credentialCount ?? summary.activeCredentials) === 0 && onAddCredential && onUploadDocument && onAddCE && onStartOnboarding) {
    return (
      <ComplianceEmptyState
        onAddCredential={onAddCredential}
        onUploadDocument={onUploadDocument}
        onAddCE={onAddCE}
        onStartOnboarding={onStartOnboarding}
      />
    );
  }

  const activeAlerts = alerts.filter(a => a.severity !== 'info').slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Setup Checklist */}
      {showChecklist && checklistItems && onChecklistAction && (
        <ComplianceSetupChecklist items={checklistItems} onAction={onChecklistAction} />
      )}

      {/* Attention Needed */}
      {activeAlerts.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.map(alert => (
              <AlertRow key={alert.id} alert={alert} onNavigate={onNavigate} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertRow({ alert, onNavigate }: { alert: ComplianceAlert; onNavigate: (tab: string) => void }) {
  const actionMap: Record<string, string> = {
    review_renewal: 'renewals',
    add_ce: 'ce-tracker',
    upload_cert: 'ce-tracker',
    upload_document: 'documents',
    link_ce: 'ce-tracker',
    edit_credential: 'credentials',
  };

  const iconMap: Record<string, React.ElementType> = {
    review_renewal: RefreshCw,
    add_ce: GraduationCap,
    upload_cert: Upload,
    upload_document: Upload,
    link_ce: Link2,
    edit_credential: Pencil,
  };

  const Icon = iconMap[alert.actionType] || Eye;

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border transition-colors', getSeverityBg(alert.severity))}>
      <div className={cn('p-1.5 rounded-md', alert.severity === 'high' ? 'bg-red-500/10' : 'bg-amber-500/10')}>
        <AlertTriangle className={cn('h-3.5 w-3.5', getSeverityColor(alert.severity))} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.message}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 shrink-0"
        onClick={() => onNavigate(actionMap[alert.actionType] || 'credentials')}
      >
        <Icon className="h-3 w-3" />
        {alert.actionLabel}
      </Button>
    </div>
  );
}
