import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile, type Profession } from '@/contexts/UserProfileContext';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

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
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [profession, setProfession] = useState<Profession>(profile?.profession || 'other');
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      home_address: homeAddress.trim(),
      invoice_email: invoiceEmail.trim() || null,
      invoice_phone: invoicePhone.trim() || null,
      timezone,
      currency,
      profession,
      
    });
    setSaving(false);
    toast.success('Profile saved');
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Your identity and business details. These act as defaults for invoices, outreach, and exports.
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
              <GooglePlacesAutocomplete
                value={homeAddress}
                onChange={setHomeAddress}
                placeholder="742 Evergreen Terrace, Portland, OR 97201"
                helperText="Used to calculate driving distance to clinics. Not shared."
              />
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
                <Input value={timezone} onChange={e => setTimezone(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Used for schedule display.</p>
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
