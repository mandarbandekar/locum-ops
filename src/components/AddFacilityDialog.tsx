import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import tzlookup from 'tz-lookup';

import { useData } from '@/contexts/DataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { GooglePlacesAutocomplete, type PlaceSelection } from '@/components/GooglePlacesAutocomplete';
import { US_TIMEZONES, isSupportedUsTz, coerceToUsTz, labelForTz } from '@/lib/usTimezones';
import { recordOnboardingStatusEvent } from '@/lib/onboardingStatusLog';

/**
 * Quick Add Clinic dialog.
 *
 * Minimal capture: name (required), address (optional), timezone (auto-derived).
 * The clinic is created with safe defaults so the user can save in seconds and
 * enrich engagement / rates / billing / contacts later from the clinic page.
 *
 * Two CTAs:
 *  - "Save & close"        → creates the clinic, fires onCreated, shows toast.
 *  - "Save & add details"  → creates the clinic, then navigates to
 *                            /facilities/:id?setup=1 so the user lands directly
 *                            on the enrichment surface.
 */
export function AddFacilityDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (facilityId: string) => void;
}) {
  const navigate = useNavigate();
  const { addFacility, facilities } = useData();
  const { profile } = useUserProfile();

  const initialTz = useMemo(() => {
    const prof = profile?.timezone;
    if (prof && isSupportedUsTz(prof)) return prof;
    const browser = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    if (browser && isSupportedUsTz(browser)) return browser;
    return 'America/New_York';
  }, [profile?.timezone]);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clinicSearchValue, setClinicSearchValue] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [clinicSelected, setClinicSelected] = useState(false);
  const [timezone, setTimezone] = useState<string>(initialTz);
  const [addressDerivedTz, setAddressDerivedTz] = useState<string | null>(null);
  const [tzAutoFilled, setTzAutoFilled] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setAddress('');
    setClinicSearchValue('');
    setManualEntry(false);
    setClinicSelected(false);
    setTimezone(initialTz);
    setAddressDerivedTz(null);
    setTzAutoFilled(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const tzFromCoords = (lat: number | null | undefined, lng: number | null | undefined): string | null => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    try {
      return coerceToUsTz(tzlookup(lat, lng));
    } catch {
      return null;
    }
  };

  const handleClinicPlaceSelect = (selection: PlaceSelection) => {
    setName(selection.name);
    setAddress(selection.formatted_address || selection.description);
    setClinicSelected(true);
    setClinicSearchValue(selection.name);
    const derived = tzFromCoords(selection.lat, selection.lng);
    if (derived) {
      setAddressDerivedTz(derived);
      setTimezone(derived);
      setTzAutoFilled(true);
    }
  };

  const handleAddressPlaceSelect = (selection: PlaceSelection) => {
    setAddress(selection.formatted_address || selection.description);
    const derived = tzFromCoords(selection.lat, selection.lng);
    if (derived) {
      setAddressDerivedTz(derived);
      setTimezone(derived);
      setTzAutoFilled(true);
    }
  };

  const canSave = !!name.trim() && !saving;

  const getInitials = (text: string): string =>
    text.split(/\s+/).map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4) || 'INV';

  /**
   * Save the clinic with safe defaults. Returns the new id, the duplicate's
   * id when the user re-adds an existing clinic, or null on hard failure.
   */
  const save = async (): Promise<{ id: string; isExisting: boolean } | null> => {
    if (!name.trim()) {
      toast.error('Please enter a clinic name');
      return null;
    }

    // Duplicate guard — same name (and address when both present).
    const trimmedName = name.trim().toLowerCase();
    const trimmedAddress = address.trim().toLowerCase();
    const duplicate = facilities.find(f => {
      const en = (f.name || '').trim().toLowerCase();
      const ea = (f.address || '').trim().toLowerCase();
      if (en !== trimmedName) return false;
      if (trimmedAddress && ea) return ea === trimmedAddress;
      return true;
    });
    if (duplicate) {
      toast.error('You already added this clinic', {
        description: `"${duplicate.name}" is already in your workspace.`,
      });
      return { id: duplicate.id, isExisting: true };
    }

    setSaving(true);
    try {
      const prefix = (getInitials(name) || 'INV').replace(/\s+/g, '') || 'INV';
      const facility = await addFacility({
        name: name.trim(),
        status: 'active',
        address,
        timezone,
        notes: '',
        outreach_last_sent_at: null,
        tech_computer_info: '',
        tech_wifi_info: '',
        tech_pims_info: '',
        clinic_access_info: '',
        invoice_prefix: prefix,
        invoice_due_days: 15,
        invoice_name_to: '',
        invoice_email_to: '',
        invoice_name_cc: '',
        invoice_email_cc: '',
        invoice_name_bcc: '',
        invoice_email_bcc: '',
        billing_cadence: 'monthly',
        billing_cycle_anchor_date: null,
        billing_week_end_day: 'saturday',
        auto_generate_invoices: true,
        generates_invoices: true,
        engagement_type: 'direct',
        source_name: null,
        tax_form_type: null,
        default_break_minutes: null,
      });
      recordOnboardingStatusEvent({
        type: 'clinic_create_succeeded',
        clinicName: name.trim(),
        facilityId: facility.id,
      });
      return { id: facility.id, isExisting: false };
    } catch (e) {
      const err = e as { message?: string; code?: string } | null;
      recordOnboardingStatusEvent({
        type: 'clinic_create_failed',
        clinicName: name.trim(),
        errorMessage: err?.message ?? 'Failed to save clinic',
        errorCode: err?.code,
      });
      toast.error('Could not save clinic');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    const result = await save();
    if (!result) return;
    onCreated?.(result.id);
    handleOpenChange(false);
    if (!result.isExisting) {
      toast.success(`${name.trim()} added`, {
        description: 'Add rates, billing, and contacts anytime from the clinic page.',
        action: {
          label: 'Add details',
          onClick: () => navigate(`/facilities/${result.id}?setup=1`),
        },
        duration: 6000,
      });
    }
  };

  const handleSaveAndAddDetails = async () => {
    const result = await save();
    if (!result) return;
    onCreated?.(result.id);
    handleOpenChange(false);
    navigate(`/facilities/${result.id}?setup=1`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Clinic
          </DialogTitle>
          <DialogDescription>
            Save the basics now. You can add engagement, rates, billing, and contacts whenever you're ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!manualEntry && !clinicSelected ? (
            <div className="space-y-2">
              <Label>Search for your clinic</Label>
              <GooglePlacesAutocomplete
                value={clinicSearchValue}
                onChange={setClinicSearchValue}
                placeholder="e.g. Valley Animal Hospital"
                searchType="establishment"
                onPlaceSelect={handleClinicPlaceSelect}
                icon="search"
              />
              <button
                type="button"
                onClick={() => setManualEntry(true)}
                className="text-xs text-primary hover:underline"
              >
                Can't find it? Enter manually
              </button>
            </div>
          ) : (
            <>
              {clinicSelected && (
                <button
                  type="button"
                  onClick={() => {
                    setClinicSelected(false);
                    setName('');
                    setAddress('');
                    setClinicSearchValue('');
                    setAddressDerivedTz(null);
                    setTzAutoFilled(false);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  ← Search again
                </button>
              )}
              <div className="space-y-1.5">
                <Label>Clinic name <span className="text-destructive">*</span></Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Clinic name"
                  autoFocus={manualEntry}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <GooglePlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="Full address"
                  onPlaceSelect={handleAddressPlaceSelect}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Clinic timezone</Label>
                <Select
                  value={timezone}
                  onValueChange={(v) => { setTimezone(v); setTzAutoFilled(false); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tzAutoFilled && addressDerivedTz === timezone ? (
                  <p className="text-[11px] text-muted-foreground">
                    Set from the clinic's address ({labelForTz(addressDerivedTz)}).
                  </p>
                ) : addressDerivedTz && addressDerivedTz !== timezone ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500">
                    The address suggests {labelForTz(addressDerivedTz)}. Double-check before saving.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Used for displaying shift times. Set to the clinic's local time, not yours.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-3 border-t border-border mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveAndClose}
            disabled={!canSave}
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Save & close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAndAddDetails}
            disabled={!canSave}
          >
            Save & add details <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
