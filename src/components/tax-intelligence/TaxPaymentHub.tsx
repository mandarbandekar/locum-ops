import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard, ExternalLink, ChevronDown, CheckCircle2,
  Wallet, Building2, AlertTriangle, HelpCircle,
} from 'lucide-react';
import {
  IRS_PAYMENT, STATE_PAYMENT_LINKS, getPaymentAccountGuidance,
} from '@/lib/taxPaymentLinks';
import type { TaxIntelligenceProfile } from '@/hooks/useTaxIntelligence';
import type { FullTaxResult } from './TaxDashboard';
import type { useTaxPaymentLogs } from '@/hooks/useTaxPaymentLogs';

interface Props {
  profile: TaxIntelligenceProfile;
  taxResult: FullTaxResult;
  nextDue: { quarter: number; label: string; due: string } | null;
  paymentLogs: ReturnType<typeof useTaxPaymentLogs>;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

type ConfirmingPayment = {
  type: string;
  amount: number;
  paidFrom: string;
  stateKey?: string;
} | null;

function AccountBadge({ account }: { account: 'personal' | 'business' }) {
  if (account === 'personal') {
    return (
      <Badge variant="success" className="gap-1 text-[11px]">
        <Wallet className="h-3 w-3" /> Personal account
      </Badge>
    );
  }
  return (
    <Badge variant="info" className="gap-1 text-[11px]">
      <Building2 className="h-3 w-3" /> S-Corp account
    </Badge>
  );
}

export default function TaxPaymentHub({ profile, taxResult, nextDue, paymentLogs }: Props) {
  const [confirmingPayment, setConfirmingPayment] = useState<ConfirmingPayment>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const isScorp = profile.entity_type === 'scorp';
  const stateCode = profile.state_code;
  const stateLink = STATE_PAYMENT_LINKS[stateCode];
  const hasStateTax = stateLink?.url !== null;
  const hasPTE = !!(taxResult.scorpPTEPayment && taxResult.scorpPTEPayment > 0);
  const quarterLabel = nextDue?.label || 'Q1';
  const quarterDue = nextDue?.due || '';

  // Calculate amounts
  const federalQuarterly = taxResult.quarterlyPayment;
  const stateQuarterly = Math.round((taxResult.personalStateTax || 0) / 4);
  const pteQuarterly = taxResult.scorpPTEQuarterly || 0;

  // Check if already paid
  const federalPaid = paymentLogs.getQuarterTotal(quarterLabel, 'federal_1040es');
  const statePaid = paymentLogs.getQuarterTotal(quarterLabel, 'state_personal');
  const ptePaid = paymentLogs.getQuarterTotal(quarterLabel, 'state_pte');

  const federalGuidance = getPaymentAccountGuidance(profile.entity_type, 'federal_1040es');
  const stateGuidance = getPaymentAccountGuidance(profile.entity_type, 'state_personal');
  const pteGuidance = getPaymentAccountGuidance(profile.entity_type, 'state_pte');

  const handlePayClick = (url: string, payment: ConfirmingPayment) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setConfirmingPayment(payment);
  };

  const handleConfirmPayment = async () => {
    if (!confirmingPayment) return;
    await paymentLogs.logPayment({
      quarter: quarterLabel,
      payment_type: confirmingPayment.type,
      amount: confirmingPayment.amount,
      paid_from: confirmingPayment.paidFrom,
      state_key: confirmingPayment.stateKey,
    });
    setConfirmingPayment(null);
  };

  if (!nextDue) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Make Your Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Inline Confirmation Prompt ── */}
        {confirmingPayment && (
          <Alert className="border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <p className="font-medium mb-2">
                Did you complete your {confirmingPayment.type === 'federal_1040es' ? 'federal' : confirmingPayment.type === 'state_pte' ? 'PTE' : 'state'} payment?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirmPayment}>
                  Yes, I paid ${fmt(confirmingPayment.amount)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmingPayment(null)}>
                  Not yet
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Row 1: Federal Payment ── */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Federal</h4>
            <span className="text-xs text-muted-foreground">{quarterLabel} due {quarterDue}</span>
          </div>

          {federalPaid >= federalQuarterly ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="font-medium text-[hsl(var(--success))]">
                Paid ${fmt(federalPaid)} on {paymentLogs.getQuarterPayments(quarterLabel).find(p => p.payment_type === 'federal_1040es')?.date_paid || 'record'}
              </span>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">${fmt(federalQuarterly)}</p>
              <div className="flex items-center gap-2">
                <AccountBadge account={federalGuidance.account} />
                <span className="text-xs text-muted-foreground">{federalGuidance.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{IRS_PAYMENT.directPay.description}</p>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => handlePayClick(IRS_PAYMENT.directPay.url, {
                  type: 'federal_1040es',
                  amount: federalQuarterly,
                  paidFrom: 'personal',
                })}
              >
                Pay federal via IRS Direct Pay <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              {isScorp && (
                <p className="text-xs text-muted-foreground italic">
                  This covers income tax on your salary + distributions. Not an S-Corp expense.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Row 2: State Payment ── */}
        {!hasStateTax ? (
          <div className="rounded-lg border p-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            <span className="text-sm font-medium">No state income tax in {stateLink?.name || stateCode}</span>
            <span className="text-xs text-muted-foreground">· Nothing to pay here</span>
          </div>
        ) : (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{stateLink?.name || stateCode}</h4>
              <span className="text-xs text-muted-foreground">{quarterLabel} due {quarterDue}</span>
            </div>

            {statePaid >= stateQuarterly && stateQuarterly > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="font-medium text-[hsl(var(--success))]">Paid ${fmt(statePaid)}</span>
              </div>
            ) : stateQuarterly > 0 ? (
              <>
                <p className="text-2xl font-bold">${fmt(stateQuarterly)}</p>
                <div className="flex items-center gap-2">
                  <AccountBadge account={stateGuidance.account} />
                  <span className="text-xs text-muted-foreground">{stateGuidance.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stateLink?.label}</p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePayClick(stateLink!.url!, {
                    type: 'state_personal',
                    amount: stateQuarterly,
                    paidFrom: 'personal',
                    stateKey: stateCode,
                  })}
                >
                  Pay {stateCode} via {stateLink?.label} <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">$0 state tax estimated this quarter</p>
            )}
          </div>
        )}

        {/* ── Row 2b: PTE Row (S-Corp only) ── */}
        {hasPTE && hasStateTax && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{stateLink?.name || stateCode} — PTE Tax (S-Corp pays)</h4>
              <span className="text-xs text-muted-foreground">{quarterLabel} due {quarterDue}</span>
            </div>

            {ptePaid >= pteQuarterly ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="font-medium text-[hsl(var(--success))]">Paid ${fmt(ptePaid)}</span>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">${fmt(pteQuarterly)}</p>
                <div className="flex items-center gap-2">
                  <AccountBadge account="business" />
                  <span className="text-xs text-muted-foreground">{pteGuidance.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stateLink?.pteLabel || `${stateCode} PTE Portal`}</p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePayClick(stateLink?.pteUrl || stateLink?.businessUrl || stateLink!.url!, {
                    type: 'state_pte',
                    amount: pteQuarterly,
                    paidFrom: 'business',
                    stateKey: stateCode,
                  })}
                >
                  Pay PTE via {stateLink?.pteLabel || `${stateCode} Portal`} <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                {pteGuidance.warning && (
                  <Alert className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--chip-warning-bg))]">
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--chip-warning-text))]" />
                    <AlertDescription className="text-xs text-[hsl(var(--chip-warning-text))]">
                      {pteGuidance.warning}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Row 3: Collapsible Explainer ── */}
        <Collapsible open={explainerOpen} onOpenChange={setExplainerOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">Why personal vs business account?</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">
              {!isScorp ? (
                <p>
                  <strong className="text-foreground">For 1099 vets:</strong> Everything you owe is personal. You are the business — there is no separate legal entity. Pay all federal and state estimates from your personal checking account via IRS Direct Pay and your state portal.
                </p>
              ) : (
                <>
                  <p className="text-foreground font-medium">For S-Corp vets — three separate obligations:</p>
                  <div className="space-y-2 ml-1">
                    <div className="flex gap-2">
                      <AccountBadge account="personal" />
                      <div>
                        <p className="font-medium text-foreground">Your 1040-ES (federal quarterly)</p>
                        <p>Pay personally. This is income tax on your salary and distributions. It is not deductible by the S-Corp. Use IRS Direct Pay.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AccountBadge account="personal" />
                      <div>
                        <p className="font-medium text-foreground">Your state personal estimate</p>
                        <p>Pay personally through {stateLink?.name || stateCode} individual tax portal. Same reasoning — this is personal income tax.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AccountBadge account="business" />
                      <div>
                        <p className="font-medium text-foreground">PTE tax (if elected)</p>
                        <p>Pay from S-Corp business account through {stateLink?.name || stateCode} business portal. This IS a deductible S-Corp expense. Paying from personal account disqualifies the deduction.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AccountBadge account="business" />
                      <div>
                        <p className="font-medium text-foreground">Payroll taxes (FICA)</p>
                        <p>Handled by your payroll provider (Gusto, QuickBooks, etc.) from your S-Corp business account automatically. Do not pay this manually.</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs italic">
                    Still unsure? Show this screen to your CPA or bookkeeper — the account source affects your deductions and should be logged correctly.
                  </p>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
