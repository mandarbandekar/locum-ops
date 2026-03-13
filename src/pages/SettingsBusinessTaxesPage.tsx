import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserProfile, type CurrentTool, type FacilitiesCountBand, type InvoicesPerMonthBand } from '@/contexts/UserProfileContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TOOL_OPTIONS: { value: CurrentTool; label: string }[] = [
  { value: 'sheets_excel', label: 'Google Sheets / Excel' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'wave', label: 'Wave' },
  { value: 'freshbooks', label: 'FreshBooks' },
  { value: 'notes', label: 'Notes' },
  { value: 'other', label: 'Other' },
];

export default function SettingsBusinessTaxesPage() {
  const { profile, updateProfile } = useUserProfile();
  const [currentTools, setCurrentTools] = useState<CurrentTool[]>(profile?.current_tools || []);
  const [facilitiesBand, setFacilitiesBand] = useState<FacilitiesCountBand>(profile?.facilities_count_band || 'band_1_3');
  const [invoicesBand, setInvoicesBand] = useState<InvoicesPerMonthBand>(profile?.invoices_per_month_band || 'inv_1_3');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');

  const toggleTool = (tool: CurrentTool) => {
    setCurrentTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      current_tools: currentTools,
      facilities_count_band: facilitiesBand,
      invoices_per_month_band: invoicesBand,
    });
    setSaving(false);
    toast.success('Business settings saved');
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Business & Taxes</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Track income, due dates, and prep details for your accountant.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="prep">Prep Options</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Operations Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facilities count</Label>
                  <Select value={facilitiesBand} onValueChange={v => setFacilitiesBand(v as FacilitiesCountBand)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="band_1_3">1–3</SelectItem>
                      <SelectItem value="band_4_8">4–8</SelectItem>
                      <SelectItem value="band_9_plus">9+</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Used to tailor tax guidance.</p>
                </div>
                <div>
                  <Label>Invoices / month</Label>
                  <Select value={invoicesBand} onValueChange={v => setInvoicesBand(v as InvoicesPerMonthBand)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inv_1_3">1–3</SelectItem>
                      <SelectItem value="inv_4_10">4–10</SelectItem>
                      <SelectItem value="inv_11_plus">11+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Current Tools</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">Which tools do you currently use to manage your practice?</p>
              <div className="flex flex-wrap gap-3">
                {TOOL_OPTIONS.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={currentTools.includes(t.value)} onCheckedChange={() => toggleTool(t.value)} />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prep" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">CPA Prep</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the Business → Taxes & Finance Ops module to manage quarterly estimates, deductions, and CPA packet preparation.
                These settings help tailor the guidance to your practice.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                All tax content is educational only — not financial advice.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
