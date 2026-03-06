import { useMemo } from 'react';
import { useCredentials } from '@/hooks/useCredentials';
import { computeCredentialStatus, getDaysUntilExpiration, CREDENTIAL_TYPE_LABELS } from '@/lib/credentialTypes';
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge';
import { CredentialExpirationChip } from '@/components/credentials/CredentialExpirationChip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck, AlertTriangle, XCircle, Clock, Upload, Bell, FileText, RefreshCw, Plus, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  onNavigate: (tab: string) => void;
  onAddCredential: () => void;
}

export function CredentialsOverview({ onNavigate, onAddCredential }: Props) {
  const { credentials, documents, isLoading } = useCredentials();

  const stats = useMemo(() => {
    const enriched = credentials.map(c => ({
      ...c,
      computedStatus: computeCredentialStatus(c.expiration_date, c.status),
      daysLeft: getDaysUntilExpiration(c.expiration_date),
    }));

    const active = enriched.filter(c => c.computedStatus === 'active').length;
    const expiring30 = enriched.filter(c => c.daysLeft !== null && c.daysLeft > 0 && c.daysLeft <= 30).length;
    const expiring60 = enriched.filter(c => c.daysLeft !== null && c.daysLeft > 30 && c.daysLeft <= 60).length;
    const expired = enriched.filter(c => c.computedStatus === 'expired').length;
    const renewing = enriched.filter(c => c.computedStatus === 'renewing').length;

    const upcomingRenewals = enriched
      .filter(c => c.daysLeft !== null && c.daysLeft > 0 && c.daysLeft <= 90)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
      .slice(0, 5);

    const recentDocs = documents.slice(0, 5);

    // Checklist: count of credential types that have at least one active credential
    const coveredTypes = new Set(enriched.filter(c => c.computedStatus === 'active').map(c => c.credential_type));
    const essentialTypes = ['veterinary_license', 'dea_registration', 'malpractice_insurance', 'w9', 'business_license'];
    const checklistComplete = essentialTypes.filter(t => coveredTypes.has(t)).length;
    const checklistTotal = essentialTypes.length;

    return { active, expiring30, expiring60, expired, renewing, upcomingRenewals, recentDocs, checklistComplete, checklistTotal, enriched, essentialTypes, coveredTypes };
  }, [credentials, documents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading overview…</p>
      </div>
    );
  }

  const checklistPercent = stats.checklistTotal > 0 ? Math.round((stats.checklistComplete / stats.checklistTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stat Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard icon={ShieldCheck} label="Active" value={stats.active} color="text-emerald-600 dark:text-emerald-400" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard icon={AlertTriangle} label="Expiring in 30d" value={stats.expiring30} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-900/20" alert={stats.expiring30 > 0} />
        <StatCard icon={Clock} label="Expiring in 60d" value={stats.expiring60} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-900/20" />
        <StatCard icon={XCircle} label="Expired" value={stats.expired} color="text-destructive" bgColor="bg-red-50 dark:bg-red-900/20" alert={stats.expired > 0} />
        <StatCard icon={RefreshCw} label="Renewing" value={stats.renewing} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Upcoming Renewals</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('renewals')}>View All</Button>
          </CardHeader>
          <CardContent>
            {stats.upcomingRenewals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No upcoming renewals in the next 90 days 🎉</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingRenewals.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.custom_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {CREDENTIAL_TYPE_LABELS[c.credential_type]}
                        {c.jurisdiction && ` · ${c.jurisdiction}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {c.expiration_date && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {format(new Date(c.expiration_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <CredentialExpirationChip expirationDate={c.expiration_date} />
                      <CredentialStatusBadge status={c.computedStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={onAddCredential}>
                <Plus className="mr-2 h-4 w-4" /> Add Credential
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('documents')}>
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('renewals')}>
                <Bell className="mr-2 h-4 w-4" /> Set Renewal Reminder
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('packets')}>
                <FileText className="mr-2 h-4 w-4" /> Create Clinic Packet
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('credentials')}>
                <RefreshCw className="mr-2 h-4 w-4" /> Mark Credential Renewed
              </Button>
            </CardContent>
          </Card>

          {/* Credential Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Essential Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{stats.checklistComplete} of {stats.checklistTotal} covered</span>
                  <span className="font-medium">{checklistPercent}%</span>
                </div>
                <Progress value={checklistPercent} className="h-2" />
              </div>
              <div className="space-y-2">
                {stats.essentialTypes.map(type => {
                  const covered = stats.coveredTypes.has(type);
                  return (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${covered ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
                      <span className={covered ? 'text-foreground' : 'text-muted-foreground'}>
                        {CREDENTIAL_TYPE_LABELS[type]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Documents */}
      {stats.recentDocs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Uploads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('documents')}>View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor, alert }: {
  icon: React.ElementType; label: string; value: number; color: string; bgColor: string; alert?: boolean;
}) {
  return (
    <Card className={`relative overflow-hidden ${alert ? 'ring-2 ring-amber-400/50' : ''}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
