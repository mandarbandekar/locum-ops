import { useState, useEffect } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile, type Profession } from '@/contexts/UserProfileContext';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { US_TIMEZONES } from '@/lib/usTimezones';
import { MapPin } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physician', label: 'Physician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'pt_ot', label: 'PT / OT' },
  { value: 'other', label: 'Other' },
];



export default function SettingsProfilePage() {
  const { profile, updateProfile } = useUserProfile();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [companyAddress, setCompanyAddress] = useState(profile?.company_address || '');
  const [homeAddress, setHomeAddress] = useState(profile?.home_address || '');
  const [invoiceEmail, setInvoiceEmail] = useState(profile?.invoice_email || '');
  const [invoicePhone, setInvoicePhone] = useState(profile?.invoice_phone || '');
  const [timezone, setTimezone] = useState(profile?.timezone || '');
  const [timezonePinned, setTimezonePinned] = useState(!!profile?.timezone_pinned);
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');

  const initialSame = !!(profile?.home_address && profile?.company_address &&
    profile.home_address.trim() === profile.company_address.trim());
  const [sameAsCompany, setSameAsCompany] = useState(initialSame);

  useEffect(() => {
    if (sameAsCompany) setHomeAddress(companyAddress);
  }, [sameAsCompany, companyAddress]);
  
  useAutoSave(
    {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      home_address: homeAddress.trim(),
      invoice_email: invoiceEmail.trim() || null,
      invoice_phone: invoicePhone.trim() || null,
      timezone,
      timezone_pinned: timezonePinned,
      currency,
      profession,
    },
    (payload) => updateProfile(payload),
    { enabled: !!profile },
  );

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Your identity and business details. Changes save automatically.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div>
              <Label>Profession</Label>
              <Select value={profession} onValueChange={v => setProfession(v as Profession)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROFESSIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Smith Veterinary Services LLC" />
            </div>
            <div>
              <Label>Company address</Label>
              <GooglePlacesAutocomplete
                value={companyAddress}
                onChange={setCompanyAddress}
                placeholder="100 Main St, Suite 200, Portland, OR 97201"
                helperText="Used in: Invoices, outreach profile."
              />
            </div>
            <div>
              <Label>Home address (for mileage)</Label>
              {sameAsCompany ? (
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    value={companyAddress}
                    disabled
                    className="pl-8 text-muted-foreground"
                    placeholder="742 Evergreen Terrace, Portland, OR 97201"
                  />
                </div>
              ) : (
                <GooglePlacesAutocomplete
                  value={homeAddress}
                  onChange={setHomeAddress}
                  placeholder="742 Evergreen Terrace, Portland, OR 97201"
                />
              )}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="same-as-company"
                  checked={sameAsCompany}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setSameAsCompany(next);
                    if (next) {
                      setHomeAddress(companyAddress);
                    } else {
                      setHomeAddress('');
                    }
                  }}
                />
                <label htmlFor="same-as-company" className="text-sm cursor-pointer select-none">
                  Same as company address
                </label>
              </div>
              {sameAsCompany && !companyAddress.trim() && (
                <p className="text-xs text-destructive mt-1">Enter a company address first.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Used to calculate driving distance to clinics. Not shared.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="jane@example.com" />
                <p className="text-xs text-muted-foreground mt-1">Used in: Invoices, outreach.</p>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={invoicePhone} onChange={e => setInvoicePhone(e.target.value)} placeholder="503-555-1234" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const deviceInUs = US_TIMEZONES.some(tz => tz.value === deviceTz);
                  const mismatch = !!deviceTz && deviceTz !== timezone;
                  if (!deviceInUs || !mismatch) return null;
                  const deviceLabel = US_TIMEZONES.find(tz => tz.value === deviceTz)?.label || deviceTz;
                  return (
                    <button
                      type="button"
                      onClick={() => { setTimezone(deviceTz); setTimezonePinned(true); }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted px-2.5 py-1 text-[11px] text-foreground transition-colors"
                    >
                      <span className="text-muted-foreground">Device detected:</span>
                      <span className="font-medium">{deviceLabel}</span>
                      <span className="text-primary font-medium">· Use this</span>
                    </button>
                  );
                })()}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tz-pinned"
                      checked={timezonePinned}
                      onCheckedChange={(v) => {
                        setTimezonePinned(v);
                        if (!v) setTimezone(deviceTz);
                      }}
                    />
                    <Label htmlFor="tz-pinned" className="text-xs cursor-pointer">Pin this timezone</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {timezonePinned
                    ? 'Pinned. Stays the same across devices.'
                    : 'Follows the device you sign in from.'}
                  {deviceTz && deviceTz !== timezone && !US_TIMEZONES.some(tz => tz.value === deviceTz) && (
                    <> Your device is currently in {deviceTz} (outside US).</>
                  )}
                </p>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem><SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
