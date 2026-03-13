import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';
import { Save, FileText } from 'lucide-react';
import { SettingsNav } from '@/components/SettingsNav';

export default function SettingsInvoiceProfilePage() {
  const { profile, updateProfile } = useUserProfile();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [companyAddress, setCompanyAddress] = useState(profile?.company_address || '');
  const [invoiceEmail, setInvoiceEmail] = useState(profile?.invoice_email || '');
  const [invoicePhone, setInvoicePhone] = useState(profile?.invoice_phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      invoice_email: invoiceEmail.trim() || null,
      invoice_phone: invoicePhone.trim() || null,
    });
    setSaving(false);
    toast.success('Invoice profile saved');
  };

  const isComplete = firstName.trim() && lastName.trim() && companyName.trim() && companyAddress.trim();

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Invoice Profile</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        This information appears on your invoices as the sender / "From" block.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Sender Details
            </CardTitle>
            <CardDescription>Required fields must be completed before you can send invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div>
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Smith Veterinary Services LLC" />
            </div>
            <div>
              <Label>Company Address <span className="text-destructive">*</span></Label>
              <Textarea
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                placeholder="100 Main St, Suite 200&#10;Portland, OR 97201"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">For invoicing purposes only.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="email" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={invoicePhone} onChange={e => setInvoicePhone(e.target.value)} placeholder="503-555-1234" />
              </div>
            </div>

            {!isComplete && (
              <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-sm">
                <p className="font-medium text-warning">Incomplete sender profile</p>
                <p className="text-muted-foreground text-xs mt-1">
                  First name, last name, company name, and company address are required before you can send invoices.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
