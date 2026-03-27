import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCalendarSync, type ExportRange } from '@/hooks/useCalendarSync';
import { useState } from 'react';
import { Copy, Download, Link2Off, RefreshCw, Smartphone, Globe, Check, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarSyncPanel() {
  const {
    googleConnection,
    feedToken,
    preferences,
    loading,
    syncing,
    connectGoogle,
    syncToGoogle,
    generateFeedToken,
    revokeFeedToken,
    regenerateFeedToken,
    updatePreferences,
    exportIcs,
    getFeedUrl,
    disconnectGoogle,
  } = useCalendarSync();

  const [exportRange, setExportRange] = useState<ExportRange>('next_30');
  const [copied, setCopied] = useState(false);

  const feedUrl = getFeedUrl();

  const handleCopyFeedUrl = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('Subscription link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading sync settings…</p>;
  }

  return (
    <div className="grid gap-4 sm:gap-6 max-w-2xl">
      {/* Apple / iCal Subscription */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Apple Calendar / iCal</CardTitle>
          </div>
          <CardDescription className="text-xs">Subscribe to a read-only LocumOps calendar feed.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {feedToken ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={feedUrl || ''} className="text-[10px] font-mono h-8" onClick={handleCopyFeedUrl} />
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyFeedUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Paste this URL into Apple Calendar → File → New Calendar Subscription.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={regenerateFeedToken}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={revokeFeedToken}>
                  <Link2Off className="h-3 w-3 mr-1" /> Revoke
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground mb-2">Generate a private link to subscribe from any iCal app.</p>
              <Button size="sm" className="h-7 text-xs" onClick={generateFeedToken}>
                <Calendar className="h-3 w-3 mr-1" /> Generate Subscription Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Calendar File */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Download Calendar File</CardTitle>
          </div>
          <CardDescription className="text-xs">Download a .ics file to import into Google Calendar or any other calendar app of your choice.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-[10px]">Date range</Label>
              <Select value={exportRange} onValueChange={(v) => setExportRange(v as ExportRange)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_30">Next 30 days</SelectItem>
                  <SelectItem value="next_90">Next 3 months</SelectItem>
                  <SelectItem value="next_180">Next 6 months</SelectItem>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="next_month">Next month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => exportIcs(exportRange)}>
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar - Coming Soon */}
      <Card className="opacity-70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Google Calendar</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming Soon</Badge>
          </div>
          <CardDescription className="text-xs">Direct two-way sync with Google Calendar is coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground">Use the Download Calendar File option above to import your shifts into Google Calendar.</p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sync Preferences</CardTitle>
          <CardDescription className="text-xs">Control what's included in calendar events.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {([
            { key: 'sync_booked_only' as const, label: 'Booked shifts only', desc: 'Skip proposed or draft shifts.' },
            { key: 'sync_future_only' as const, label: 'Future shifts only', desc: "Don't include past shifts." },
            { key: 'include_facility_address' as const, label: 'Include facility address', desc: 'Show clinic address in the event location.' },
            { key: 'include_notes' as const, label: 'Include shift notes', desc: 'Add notes to the event description.' },
          ]).map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">{item.label}</span>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={preferences[item.key]}
                onCheckedChange={(v) => updatePreferences({ [item.key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
