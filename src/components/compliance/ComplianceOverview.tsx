import { useMemo } from 'react';
import { useComplianceData, type ComplianceAlert } from '@/hooks/useComplianceData';
import { getReadinessColor, getReadinessBgColor, getReadinessDisplayLabel, getSeverityColor, getSeverityBg } from '@/lib/complianceReadiness';
import { CREDENTIAL_TYPE_LABELS } from '@/lib/credentialTypes';
import { CredentialExpirationChip } from '@/components/credentials/CredentialExpirationChip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck, AlertTriangle, FileX, GraduationCap, CheckCircle2,
  Clock, ChevronRight, Upload, Plus, RefreshCw, Eye, Link2, Pencil,
  Activity, ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  onNavigate: (tab: string) => void;
}

export function ComplianceOverview({ onNavigate }: Props) {
  const { summary, alerts, upcomingRenewals, enrichedCredentials, isLoading } = useComplianceData();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading compliance data…</p></div>;
  }

  const activeAlerts = alerts.filter(a => a.severity !== 'info').slice(0, 6);
  const infoAlerts = alerts.filter(a => a.severity === 'info').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={ShieldCheck}
          label="Active Credentials"
          value={summary.activeCredentials}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-500/10"
          onClick={() => onNavigate('credentials')}
        />
        <SummaryCard
          icon={Clock}
          label="Renewals Due Soon"
          value={summary.renewalsDueSoon}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-500/10"
          alert={summary.renewalsDueSoon > 0}
          onClick={() => onNavigate('renewals')}
        />
        <SummaryCard
          icon={FileX}
          label="Missing Documents"
          value={summary.missingDocuments}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-500/10"
          alert={summary.missingDocuments > 0}
          onClick={() => onNavigate('documents')}
        />
        <SummaryCard
          icon={GraduationCap}
          label="CE Incomplete"
          value={summary.ceIncomplete}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-500/10"
          alert={summary.ceIncomplete > 0}
          onClick={() => onNavigate('ce-tracker')}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Ready to Renew"
          value={summary.readyToRenew}
          color="text-primary"
          bgColor="bg-primary/10"
          onClick={() => onNavigate('renewals')}
        />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Renewals</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onNavigate('renewals')}>
              View All <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingRenewals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming renewals in the next 120 days 🎉</p>
            ) : (
              <div className="space-y-2">
                {upcomingRenewals.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{c.custom_title}</p>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', getReadinessBgColor(c.readiness.label), getReadinessColor(c.readiness.label))}>
                          {c.readiness.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{CREDENTIAL_TYPE_LABELS[c.credential_type] || c.credential_type}</span>
                        {c.jurisdiction && <span>· {c.jurisdiction}</span>}
                        {c.readiness.missingItems.length > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {c.readiness.missingItems.length} missing
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <CredentialExpirationChip expirationDate={c.expiration_date} />
                      {c.readiness.recommendedAction && (
                        <Button variant="outline" size="sm" className="h-7 text-xs hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.readiness.recommendedAction} <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Readiness Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Readiness Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enrichedCredentials
                .filter(c => c.computedStatus !== 'archived')
                .sort((a, b) => a.readiness.score - b.readiness.score)
                .slice(0, 5)
                .map(c => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">{c.custom_title}</span>
                      <span className={cn('text-xs font-medium', getReadinessColor(c.readiness.label))}>
                        {c.readiness.score}%
                      </span>
                    </div>
                    <Progress value={c.readiness.score} className="h-1.5" />
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Informational alerts */}
          {infoAlerts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {infoAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                    <Link2 className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">{alert.title}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bgColor, alert, onClick }: {
  icon: React.ElementType; label: string; value: number; color: string; bgColor: string; alert?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all',
        alert && 'ring-1 ring-amber-500/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
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
