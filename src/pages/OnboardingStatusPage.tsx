import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Building2,
} from 'lucide-react';
import {
  getOnboardingStatusEvents,
  summarizeOnboardingStatus,
  type ClinicStatusSummary,
} from '@/lib/onboardingStatusLog';

interface EnrichedRow extends ClinicStatusSummary {
  /** True if a terms_snapshots row currently exists for this facility */
  ratesPersistedInDb: boolean;
}

function actionFor(row: EnrichedRow): { label: string; to: string } | null {
  // Clinic missing → restart add-clinic flow.
  if (!row.clinicCreated) {
    return { label: 'Retry adding clinic', to: '/onboarding' };
  }
  // Clinic exists but rates didn't persist → deep-link to facility detail page
  // where the user can add rates inline.
  if (row.ratesAttempted && (!row.ratesSaved || !row.ratesPersistedInDb) && row.facilityId) {
    return { label: 'Fix rates for this clinic', to: `/facilities/${row.facilityId}` };
  }
  return null;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
          : 'border-destructive/40 text-destructive'
      }
    >
      {ok ? (
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      ) : (
        <XCircle className="mr-1 h-3.5 w-3.5" />
      )}
      {label}
    </Badge>
  );
}

export default function OnboardingStatusPage() {
  const navigate = useNavigate();
  const { facilities, terms } = useData();

  const rows: EnrichedRow[] = useMemo(() => {
    const events = getOnboardingStatusEvents();
    const summary = summarizeOnboardingStatus(events);

    return summary.map((s) => {
      // Resolve facility id from live data when the event log doesn't have it
      // (e.g. older events or partial logging).
      const matchedFacility =
        (s.facilityId && facilities.find((f) => f.id === s.facilityId)) ||
        facilities.find(
          (f) => f.name.trim().toLowerCase() === s.clinicName.trim().toLowerCase(),
        );

      const facilityId = matchedFacility?.id ?? s.facilityId ?? null;
      const ratesPersistedInDb = facilityId
        ? terms.some((t) => t.facility_id === facilityId)
        : false;

      return {
        ...s,
        facilityId,
        // If we found the facility live, treat clinic creation as confirmed,
        // even if the original success event was lost.
        clinicCreated: s.clinicCreated || !!matchedFacility,
        ratesPersistedInDb,
      };
    });
  }, [facilities, terms]);

  const totals = useMemo(() => {
    const clinicsOk = rows.filter((r) => r.clinicCreated).length;
    const ratesOk = rows.filter(
      (r) => !r.ratesAttempted || (r.ratesSaved && r.ratesPersistedInDb),
    ).length;
    const issues = rows.filter(
      (r) =>
        !r.clinicCreated ||
        (r.ratesAttempted && (!r.ratesSaved || !r.ratesPersistedInDb)),
    ).length;
    return { total: rows.length, clinicsOk, ratesOk, issues };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Onboarding status
          </h1>
          <p className="mt-2 text-muted-foreground">
            A quick summary of what saved successfully during your setup, and
            what still needs your attention.
          </p>
        </header>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No onboarding activity recorded in this session yet.
              </p>
              <Button asChild className="mt-4">
                <Link to="/onboarding">Start onboarding</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">
                    {totals.clinicsOk}/{totals.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Clinics created
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-semibold">
                    {totals.ratesOk}/{totals.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rates saved
                  </div>
                </div>
                <div>
                  <div
                    className={
                      'text-2xl font-semibold ' +
                      (totals.issues > 0 ? 'text-destructive' : '')
                    }
                  >
                    {totals.issues}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Need attention
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {rows.map((row) => {
                const action = actionFor(row);
                const ratesOk =
                  !row.ratesAttempted ||
                  (row.ratesSaved && row.ratesPersistedInDb);
                const hasIssue = !row.clinicCreated || !ratesOk;

                return (
                  <Card
                    key={(row.facilityId ?? row.clinicName) + row.lastEventAt}
                    className={hasIssue ? 'border-destructive/40' : undefined}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {row.clinicName}
                          </CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last update{' '}
                            {new Date(row.lastEventAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill
                            ok={row.clinicCreated}
                            label={
                              row.clinicCreated ? 'Clinic created' : 'Clinic failed'
                            }
                          />
                          {row.ratesAttempted && (
                            <StatusPill
                              ok={ratesOk}
                              label={
                                ratesOk
                                  ? `${row.rateCount || ''} rates saved`.trim()
                                  : 'Rates failed'
                              }
                            />
                          )}
                          {!row.ratesAttempted && row.clinicCreated && (
                            <Badge
                              variant="outline"
                              className="border-muted-foreground/30 text-muted-foreground"
                            >
                              <DollarSign className="mr-1 h-3.5 w-3.5" />
                              No rates entered
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {(row.clinicError ||
                      row.ratesError ||
                      (row.ratesAttempted && !row.ratesPersistedInDb && row.ratesSaved) ||
                      action) && (
                      <CardContent className="pt-0">
                        {(row.clinicError ||
                          row.ratesError ||
                          (row.ratesAttempted &&
                            !row.ratesPersistedInDb &&
                            row.ratesSaved)) && (
                          <div className="space-y-3">
                            {row.clinicError && (
                              <ErrorBlock
                                title="Clinic could not be saved"
                                message={row.clinicError.message}
                                code={row.clinicError.code}
                                hint="Recheck the clinic name and address, then retry. If it keeps failing, your session may have expired — sign back in and try again."
                              />
                            )}
                            {row.ratesError && (
                              <ErrorBlock
                                title="Rates failed to save"
                                message={row.ratesError.message}
                                code={row.ratesError.code}
                                hint="Open the clinic and re-enter the rates from the Rates section. Each rate needs an amount and a type (hourly or flat)."
                              />
                            )}
                            {row.ratesAttempted &&
                              row.ratesSaved &&
                              !row.ratesPersistedInDb && (
                                <ErrorBlock
                                  title="Rates saved locally but not found in your account"
                                  message="The rates were submitted, but no matching record exists on the server."
                                  hint="This usually means the save was rolled back. Re-enter the rates from the clinic page."
                                />
                              )}
                          </div>
                        )}

                        {action && (
                          <>
                            <Separator className="my-4" />
                            <div className="flex justify-end">
                              <Button asChild size="sm">
                                <Link to={action.to}>{action.label}</Link>
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="outline" asChild>
                <Link to="/onboarding">Back to onboarding</Link>
              </Button>
              <Button asChild>
                <Link to="/">Go to dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorBlock({
  title,
  message,
  code,
  hint,
}: {
  title: string;
  message: string;
  code?: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground break-words">
            {message}
            {code ? ` (${code})` : ''}
          </p>
          <p className="text-xs">{hint}</p>
        </div>
      </div>
    </div>
  );
}
