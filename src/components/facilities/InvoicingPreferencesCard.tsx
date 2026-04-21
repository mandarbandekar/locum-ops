import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Receipt, Edit2, Save, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import type { Facility, BillingCadence } from '@/types';

interface InvoicingPreferencesCardProps {
  facility: Facility;
  onUpdate: (f: Facility) => void;
}

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly (Mon–Sun)',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
};

export function InvoicingPreferencesCard({ facility, onUpdate }: InvoicingPreferencesCardProps) {
  const [editing, setEditing] = useState(false);
  const [billingCadence, setBillingCadence] = useState<BillingCadence>(facility.billing_cadence || 'monthly');
  
  const [dueDays, setDueDays] = useState(facility.invoice_due_days ?? 15);
  const [prefix, setPrefix] = useState(facility.invoice_prefix || 'INV');
  const [nameTo, setNameTo] = useState(facility.invoice_name_to || '');
  const [emailTo, setEmailTo] = useState(facility.invoice_email_to || '');
  const [nameCc, setNameCc] = useState(facility.invoice_name_cc || '');
  const [emailCc, setEmailCc] = useState(facility.invoice_email_cc || '');
  const [nameBcc, setNameBcc] = useState(facility.invoice_name_bcc || '');
  const [emailBcc, setEmailBcc] = useState(facility.invoice_email_bcc || '');
  const [showCadenceConfirm, setShowCadenceConfirm] = useState(false);

  const { invoices } = useData();

  const hasBillingContact = !!(facility.invoice_name_to?.trim() && facility.invoice_email_to?.trim());
  const editingHasBillingContact = !!(nameTo.trim() && emailTo.trim());

  // Count automatic drafts that would be regrouped
  const autoDraftCount = invoices.filter(
    (inv) => inv.facility_id === facility.id && inv.status === 'draft' && inv.generation_type === 'automatic'
  ).length;

  const cadenceChanged = billingCadence !== (facility.billing_cadence || 'monthly');

  const persistChanges = () => {
    onUpdate({
      ...facility,
      billing_cadence: billingCadence,
      auto_generate_invoices: true,
      invoice_due_days: dueDays,
      invoice_prefix: prefix,
      billing_week_end_day: facility.billing_week_end_day,
      billing_cycle_anchor_date: null,
      invoice_name_to: nameTo.trim(),
      invoice_email_to: emailTo.trim(),
      invoice_name_cc: nameCc.trim(),
      invoice_email_cc: emailCc.trim(),
      invoice_name_bcc: nameBcc.trim(),
      invoice_email_bcc: emailBcc.trim(),
    });
    setEditing(false);
    toast.success('Invoicing preferences saved');
  };

  const handleSave = () => {
    if (cadenceChanged && autoDraftCount > 0) {
      setShowCadenceConfirm(true);
      return;
    }
    persistChanges();
  };

  const confirmCadenceChange = () => {
    setShowCadenceConfirm(false);
    persistChanges();
  };

  const handleCancel = () => {
    setBillingCadence(facility.billing_cadence || 'monthly');
    
    setDueDays(facility.invoice_due_days ?? 15);
    setPrefix(facility.invoice_prefix || 'INV');
    setNameTo(facility.invoice_name_to || '');
    setEmailTo(facility.invoice_email_to || '');
    setNameCc(facility.invoice_name_cc || '');
    setEmailCc(facility.invoice_email_cc || '');
    setNameBcc(facility.invoice_name_bcc || '');
    setEmailBcc(facility.invoice_email_bcc || '');
    setEditing(false);
  };

  // First-time / unconfigured state
  const isFirstTime = !facility.invoice_email_to?.trim() && !facility.auto_generate_invoices;

  if (!editing && isFirstTime) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 flex flex-col items-center text-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Set up invoicing for this facility</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Choose how often invoices should be generated and who they should be sent to.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing(true)}>Set up invoicing</Button>
        </CardContent>
      </Card>
    );
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Invoicing Preferences</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Cadence & Auto-generate */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Billing cadence</span>
            <Badge variant="secondary" className="font-medium">
              {CADENCE_LABELS[facility.billing_cadence as BillingCadence] || 'Monthly'}
            </Badge>
          </div>
          {facility.billing_cadence === 'weekly' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing week</span>
              <span className="font-medium">Monday – Sunday</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment terms</span>
            <span className="font-medium">Net {facility.invoice_due_days ?? 15}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invoice prefix</span>
            <span className="font-medium">{facility.invoice_prefix || 'INV'}</span>
          </div>

          {/* Billing contact */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Billing Contact</p>
            {hasBillingContact ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Using saved billing contact</span>
                </div>
                <p className="text-sm font-medium pl-5">{facility.invoice_name_to}</p>
                <p className="text-xs text-muted-foreground pl-5">{facility.invoice_email_to}</p>
                {facility.invoice_email_cc && (
                  <p className="text-xs text-muted-foreground pl-5">CC: {facility.invoice_name_cc} · {facility.invoice_email_cc}</p>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Add a billing contact to enable invoice generation and sending.</p>
                  <Button size="sm" variant="link" className="h-auto p-0 text-xs mt-1" onClick={() => setEditing(true)}>
                    Add billing contact →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Editing mode ──
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Invoicing Preferences</CardTitle>
          </div>
          <CardDescription className="mt-1">Choose how often invoices should be generated for this facility.</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}><X className="mr-1 h-3 w-3" /> Cancel</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Billing Cadence */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Billing Cadence</Label>
            <Select value={billingCadence} onValueChange={(v) => setBillingCadence(v as BillingCadence)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly (Mon–Sun)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {billingCadence === 'weekly' && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Billing week runs Monday through Sunday. Draft generates on the morning of your last scheduled shift that week.</p>
            )}
            {billingCadence === 'monthly' && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Draft generates on the morning of your last scheduled shift of the month.</p>
            )}
            {billingCadence === 'daily' && (
              <p className="text-[10px] text-muted-foreground mt-0.5">A draft invoice is generated each morning you have a scheduled shift.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Invoice Prefix</Label>
            <Input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="INV" className="h-9" />
            <p className="text-[10px] text-muted-foreground mt-0.5">e.g. {prefix}-2026-001</p>
          </div>
        </div>

        {/* Payment terms */}
        <div>
          <Label className="text-xs">Payment Terms (days)</Label>
          <Select value={String(dueDays)} onValueChange={v => setDueDays(Number(v))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Net 7</SelectItem>
              <SelectItem value="14">Net 14</SelectItem>
              <SelectItem value="15">Net 15</SelectItem>
              <SelectItem value="30">Net 30</SelectItem>
              <SelectItem value="45">Net 45</SelectItem>
              <SelectItem value="60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto-generate */}

        {/* Billing Contact */}
        <div className="pt-2 border-t space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Billing Contact (To)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameTo} onChange={e => setNameTo(e.target.value)} placeholder="Billing Department" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="billing@clinic.com" className="h-9" />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-1">CC (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameCc} onChange={e => setNameCc(e.target.value)} placeholder="Office Manager" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="manager@clinic.com" className="h-9" />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-1">BCC (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={nameBcc} onChange={e => setNameBcc(e.target.value)} placeholder="Records" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={emailBcc} onChange={e => setEmailBcc(e.target.value)} placeholder="records@clinic.com" className="h-9" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
