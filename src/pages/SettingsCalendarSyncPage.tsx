import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCalendarSync, type ExportRange } from '@/hooks/useCalendarSync';
import { useState } from 'react';
import { Calendar, Copy, Download, ExternalLink, Link2Off, RefreshCw, Smartphone, Globe, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsCalendarSyncPage() {
  const {
    googleConnection,
    feedToken,
    preferences,
    loading,
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
    return (
      <div>
        <SettingsNav />
        <div className="page-header"><h1 className="page-title">Calendar Sync</h1></div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Calendar Sync</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Keep your booked shifts visible in the calendar you already use.
      </p>

      <div className="grid gap-6 max-w-2xl">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Google Calendar</CardTitle>
              </div>
              {googleConnection ? (
                <Badge variant="secondary" className="text-xs">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>
              )}
            </div>
            <CardDescription>Sync booked shifts automatically to Google Calendar.</CardDescription>
          </CardHeader>
          <CardContent>
            {googleConnection ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Account:</span>{' '}
                  <span className="font-medium">{googleConnection.google_email || 'Connected'}</span>
                </div>
                {googleConnection.external_calendar_id && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Calendar:</span>{' '}
                    <span className="font-medium">{googleConnection.external_calendar_id}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={disconnectGoogle}>
                  <Link2Off className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your Google account to automatically sync booked shifts.
                </p>
                <Button size="sm" disabled>
                  <Globe className="h-3.5 w-3.5 mr-1.5" /> Connect Google Calendar
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Google Calendar sync requires additional setup. Coming soon.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apple / iCal Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Apple Calendar / iCal</CardTitle>
            </div>
            <CardDescription>Subscribe to a read-only LocumOps calendar feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedToken ? (
              <>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={feedUrl || ''}
                    className="text-xs font-mono"
                    onClick={handleCopyFeedUrl}
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyFeedUrl} title="Copy link">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this URL into Apple Calendar → File → New Calendar Subscription, or any iCal-compatible app.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={regenerateFeedToken}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                  </Button>
                  <Button variant="outline" size="sm" onClick={revokeFeedToken}>
                    <Link2Off className="h-3.5 w-3.5 mr-1.5" /> Revoke
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Generate a private link to subscribe from Apple Calendar, Outlook, or any iCal app.
                </p>
                <Button size="sm" onClick={generateFeedToken}>
                  <Calendar className="h-3.5 w-3.5 mr-1.5" /> Generate Subscription Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Export .ics</CardTitle>
            </div>
            <CardDescription>Download a calendar file to import anywhere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs">Date range</Label>
                <Select value={exportRange} onValueChange={(v) => setExportRange(v as ExportRange)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next_30">Next 30 days</SelectItem>
                    <SelectItem value="this_month">This month</SelectItem>
                    <SelectItem value="next_month">Next month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={() => exportIcs(exportRange)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Preferences</CardTitle>
            <CardDescription>Control what's included in calendar events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Booked shifts only</span>
                <p className="text-xs text-muted-foreground mt-0.5">Skip proposed or draft shifts.</p>
              </div>
              <Switch
                checked={preferences.sync_booked_only}
                onCheckedChange={(v) => updatePreferences({ sync_booked_only: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Future shifts only</span>
                <p className="text-xs text-muted-foreground mt-0.5">Don't include past shifts.</p>
              </div>
              <Switch
                checked={preferences.sync_future_only}
                onCheckedChange={(v) => updatePreferences({ sync_future_only: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Include facility address</span>
                <p className="text-xs text-muted-foreground mt-0.5">Show clinic address in the calendar event location.</p>
              </div>
              <Switch
                checked={preferences.include_facility_address}
                onCheckedChange={(v) => updatePreferences({ include_facility_address: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Include shift notes</span>
                <p className="text-xs text-muted-foreground mt-0.5">Add your notes to the calendar event description.</p>
              </div>
              <Switch
                checked={preferences.include_notes}
                onCheckedChange={(v) => updatePreferences({ include_notes: v })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
