import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, UserPlus, ExternalLink, CheckCircle2, CalendarIcon } from 'lucide-react';
import {
  type BillingCadence,
  type FacilityBillingConfig,
  getDefaultBillingConfig,
  hasBillingContact,
  validateSenderProfile,
} from '@/lib/invoiceBillingDefaults';
import { formatPaymentTerms } from '@/lib/invoiceHelpers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { computeBiweeklyWindows } from '@/lib/biweeklyHelpers';

function parseDateOnly(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function formatDateOnly(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

const ONBOARDING_STEPS = [
  { key: 'facilities', label: 'Facility Billing Setup' },
  { key: 'payments', label: 'Payment Methods' },
  { key: 'review', label: 'Automation Review' },
] as const;

const CADENCE_OPTIONS: { value: BillingCadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface PaymentMethod {
  key: string;
  label: string;
  enabled: boolean;
  instructions: string;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { key: 'ach', label: 'ACH / Bank Transfer', enabled: false, instructions: '' },
  { key: 'check', label: 'Check', enabled: false, instructions: '' },
  { key: 'zelle', label: 'Zelle', enabled: false, instructions: '' },
  { key: 'paypal', label: 'PayPal', enabled: false, instructions: '' },
  { key: 'venmo', label: 'Venmo', enabled: false, instructions: '' },
];

interface Props {
  onComplete: () => void;
}

export function InvoiceOnboardingStepper({ onComplete }: Props) {
  const { facilities, updateFacility } = useData();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [billingConfigs, setBillingConfigs] = useState<Record<string, FacilityBillingConfig>>(() => {
    const configs: Record<string, FacilityBillingConfig> = {};
    facilities.filter(f => f.status === 'active').forEach(f => {
      configs[f.id] = getDefaultBillingConfig(f.id);
    });
    return configs;
  });
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);

  // Inline contact editing
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const activeFacilities = facilities.filter(f => f.status === 'active');

  const senderProfile = useMemo(() => {
    if (!profile) return null;
    return validateSenderProfile({
      first_name: profile.first_name,
      last_name: profile.last_name,
      company_name: profile.company_name,
      company_address: profile.company_address,
      email: profile.invoice_email,
      phone: profile.invoice_phone,
    });
  }, [profile]);

  const updateConfig = (facilityId: string, updates: Partial<FacilityBillingConfig>) => {
    setBillingConfigs(prev => ({
      ...prev,
      [facilityId]: { ...prev[facilityId], ...updates },
    }));
  };

  const startEditContact = (facilityId: string) => {
    const fac = facilities.find(f => f.id === facilityId);
    setEditingFacilityId(facilityId);
    setEditName(fac?.invoice_name_to || '');
    setEditEmail(fac?.invoice_email_to || '');
  };

  const saveContact = async () => {
    if (!editingFacilityId || !editName.trim() || !editEmail.trim()) return;
    const fac = facilities.find(f => f.id === editingFacilityId);
    if (!fac) return;
    await updateFacility({
      ...fac,
      invoice_name_to: editName.trim(),
      invoice_email_to: editEmail.trim(),
    });
    toast.success('Billing contact saved');
    setEditingFacilityId(null);
  };

  const biweeklyMissingFacility = activeFacilities.find(f => {
    const c = billingConfigs[f.id];
    return c?.billing_cadence === 'biweekly' && !c?.biweekly_anchor_date;
  });

  const handleNextFromStep0 = () => {
    if (biweeklyMissingFacility) {
      toast.error(`Pick a first pay period date for ${biweeklyMissingFacility.name} (biweekly).`);
      return;
    }
    setStep(1);
  };

  const handleCompleteGuarded = async () => {
    if (biweeklyMissingFacility) {
      toast.error(`Pick a first pay period date for ${biweeklyMissingFacility.name} (biweekly).`);
      setStep(0);
      return;
    }
    await handleComplete();
  };

  const handleComplete = async () => {
    // Persist billing configs to each facility
    for (const fac of activeFacilities) {
      const config = billingConfigs[fac.id];
      if (config) {
        await updateFacility({
          ...fac,
          billing_cadence: config.billing_cadence,
          billing_week_end_day: config.billing_week_end_day,
          auto_generate_invoices: true,
          billing_cycle_anchor_date: config.biweekly_anchor_date,
        });
      }
    }
    toast.success('Invoice setup complete');
    onComplete();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {ONBOARDING_STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 ${
                step > i ? 'bg-primary text-primary-foreground' :
                step === i ? 'bg-primary/15 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {step > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${step === i ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded ${step > i ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Sender profile notice */}
      {step === 0 && senderProfile && !senderProfile.valid && (
        <div className="flex items-start gap-2 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Complete your invoice profile before automated invoicing can be enabled.</p>
            <p className="text-xs mt-0.5 opacity-80">Missing: {senderProfile.missing.join(', ')}</p>
            <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-amber-700 dark:text-amber-400" onClick={() => navigate('/settings/profile')}>
              Go to Profile Settings <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {step === 0 && senderProfile?.valid && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg px-4 py-3 mb-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Using your existing account details for invoice sender information.</span>
        </div>
      )}

      {/* STEP 1: Facility Billing Setup */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Configure billing cadence and contacts for each facility.</p>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Facility</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Billing Cadence</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Billing Contact</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Due</th>
                  
                </tr>
              </thead>
              <tbody>
                {activeFacilities.map(fac => {
                  const config = billingConfigs[fac.id] || getDefaultBillingConfig(fac.id);
                  const hasContact = hasBillingContact(fac);
                  const isEditing = editingFacilityId === fac.id;

                  return (
                    <tr key={fac.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{fac.name}</td>
                      <td className="p-3">
                        <Select value={config.billing_cadence} onValueChange={(v: BillingCadence) => updateConfig(fac.id, { billing_cadence: v })}>
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CADENCE_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {config.billing_cadence === 'weekly' && (
                          <p className="text-[10px] text-muted-foreground mt-1">Weekly invoices default to Saturday billing close.</p>
                        )}
                        {config.billing_cadence === 'biweekly' && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-[10px] text-muted-foreground">One invoice every two weeks, aligned to the clinic's payroll cycle. Draft generates on the morning of your last scheduled shift in each 14-day period.</p>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    'h-8 w-[180px] justify-start text-left font-normal text-xs',
                                    !config.biweekly_anchor_date && 'text-muted-foreground',
                                  )}
                                >
                                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                                  {config.biweekly_anchor_date
                                    ? format(parseDateOnly(config.biweekly_anchor_date)!, 'MMM d, yyyy')
                                    : <span>First pay period…</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parseDateOnly(config.biweekly_anchor_date)}
                                  onSelect={(d) => updateConfig(fac.id, { biweekly_anchor_date: d ? formatDateOnly(d) : null })}
                                  initialFocus
                                  className={cn('p-3 pointer-events-auto')}
                                />
                              </PopoverContent>
                            </Popover>
                            <p className="text-[10px] text-muted-foreground">First pay period starts on — pick any one of this clinic's pay-period start dates. Invoices repeat every 14 days from this date.</p>
                            {!config.biweekly_anchor_date && (
                              <p className="text-[10px] text-destructive">Required for biweekly billing.</p>
                            )}
                            {config.biweekly_anchor_date && (() => {
                              const windows = computeBiweeklyWindows(config.biweekly_anchor_date);
                              if (!windows.length) return null;
                              return (
                                <div className="mt-1.5 rounded-md bg-primary/5 border border-primary/10 px-2.5 py-1.5 space-y-0.5">
                                  <p className="text-[10px] font-medium text-primary">Upcoming pay periods</p>
                                  {windows.map((w, i) => (
                                    <p key={i} className="text-[10px] text-foreground font-medium">{w.start} – {w.end}</p>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1.5 min-w-[200px]">
                            <Input className="h-7 text-xs" placeholder="Contact name" value={editName} onChange={e => setEditName(e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs px-2" onClick={saveContact} disabled={!editName.trim() || !editEmail.trim()}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingFacilityId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : hasContact ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              <span className="text-xs">{fac.invoice_name_to}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Using saved billing contact.</span>
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                            onClick={() => startEditContact(fac.id)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add a billing contact
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatPaymentTerms(fac.invoice_due_days)}</td>
                    </tr>
                  );
                })}
                {activeFacilities.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                      No active facilities. Add a facility first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {activeFacilities.some(f => !hasBillingContact(f)) && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Add a billing contact to enable invoice generation and sending.
            </div>
          )}

          {biweeklyMissingFacility && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Pick a first pay period date for {biweeklyMissingFacility.name} (biweekly) to continue.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleNextFromStep0} disabled={!!biweeklyMissingFacility}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Payment Methods */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure accepted payment methods shown on your invoices.</p>

          <div className="grid gap-3">
            {methods.map(method => (
              <Card key={method.key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{method.label}</span>
                    <Switch
                      checked={method.enabled}
                      onCheckedChange={() => setMethods(prev => prev.map(m => m.key === method.key ? { ...m, enabled: !m.enabled } : m))}
                    />
                  </div>
                  {method.enabled && (
                    <div>
                      <Label className="text-xs">Display instructions</Label>
                      <Input
                        className="h-8 text-xs mt-1"
                        value={method.instructions}
                        onChange={e => setMethods(prev => prev.map(m => m.key === method.key ? { ...m, instructions: e.target.value } : m))}
                        placeholder={
                          method.key === 'ach' ? 'Routing: ••• / Account: •••'
                          : method.key === 'check' ? 'Make payable to: Your Business LLC'
                          : method.key === 'zelle' ? 'you@example.com'
                          : method.key === 'paypal' ? 'paypal.me/you'
                          : '@yourusername'
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Automation Review */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Draft invoices generated automatically</p>
                <p className="text-xs text-muted-foreground">LocumOps will generate draft invoices automatically based on each facility's billing cadence.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Profile &amp; contacts reused</p>
                <p className="text-xs text-muted-foreground">Invoices will use your existing profile and facility billing contact details.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Review before sending</p>
                <p className="text-xs text-muted-foreground">Draft invoices must still be reviewed before sending. Nothing goes out without your approval.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Facilities configured</p>
            <div className="flex flex-wrap gap-2">
              {activeFacilities.map(f => {
                const config = billingConfigs[f.id];
                return (
                  <Badge key={f.id} variant="secondary" className="text-xs">
                    {f.name} · {config?.billing_cadence || 'monthly'}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleCompleteGuarded} disabled={!!biweeklyMissingFacility}>
              Complete Setup <Check className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
