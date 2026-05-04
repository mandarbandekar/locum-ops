import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useEffect, useState } from 'react';
import { Copy, Check, ChevronDown, AlertCircle, Apple, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CalendarSyncPanel() {
  const { feedToken, loading, generateFeedToken, getFeedUrl } = useCalendarSync();
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(true);
  const [macOpen, setMacOpen] = useState(false);
  const [troubleOpen, setTroubleOpen] = useState(false);

  const feedUrl = getFeedUrl();

  useEffect(() => {
    if (!loading && !feedToken) {
      generateFeedToken();
    }
  }, [loading, feedToken, generateFeedToken]);

  const handleCopy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('Calendar URL copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">Sync your shifts to your calendar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          See your Locum Ops schedule in Apple Calendar or Google Calendar. Setup takes about 2 minutes.
        </p>
      </div>

      {/* PRIMARY ACTION: Copy URL */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Your Locum Ops calendar URL</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={loading || !feedUrl ? 'Generating your calendar URL…' : feedUrl}
              className="text-xs font-mono"
              onClick={handleCopy}
            />
            <Button onClick={handleCopy} disabled={!feedUrl} className="shrink-0">
              {copied ? <><Check className="h-4 w-4 mr-1.5" /> Copied</> : <><Copy className="h-4 w-4 mr-1.5" /> Copy URL</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">You'll paste this URL during setup below.</p>
        </CardContent>
      </Card>

      {/* HOW THIS WORKS */}
      <Collapsible open={howOpen} onOpenChange={setHowOpen}>
        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(var(--ochre, 36 45% 43%))' }}>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" style={{ color: 'hsl(var(--ochre, 36 45% 43%))' }} />
                  <CardTitle className="text-base">Important — please read before setting up</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${howOpen ? 'rotate-180' : ''}`} />
              </CardHeader>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm space-y-3 text-foreground/90">
              <div>
                <p className="font-medium">This sync is one-way.</p>
                <p className="text-muted-foreground">
                  Your Locum Ops shifts appear in your calendar as a read-only feed. Editing or deleting
                  an event in your calendar will <strong>not</strong> change anything in Locum Ops.
                  Always make schedule changes inside Locum Ops.
                </p>
              </div>
              <div>
                <p className="font-medium">Updates are not instant.</p>
                <p className="text-muted-foreground">
                  External calendar apps refresh subscribed calendars on their own schedule:
                </p>
                <ul className="list-disc pl-5 mt-1 text-muted-foreground space-y-0.5">
                  <li>Apple Calendar: typically every 15 minutes to 1 hour</li>
                  <li>Google Calendar: typically every 8 to 24 hours</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                This refresh interval is set by Apple and Google — it is not something Locum Ops can speed up.
              </p>
              <p className="text-muted-foreground">
                For the most current schedule, always check Locum Ops directly. Use calendar sync as a passive
                overview, not a real-time tool.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SETUP CARDS */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Apple Calendar</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">iPhone, iPad, or Mac</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal pl-5 space-y-1.5 text-foreground/90">
              <li>Tap "Copy URL" at the top of this page</li>
              <li>Open the <strong>Settings</strong> app on your iPhone (not the Calendar app)</li>
              <li>Scroll down and tap <strong>Calendar</strong></li>
              <li>Tap <strong>Accounts</strong> then <strong>Add Account</strong></li>
              <li>Tap <strong>Other</strong> then <strong>Add Subscribed Calendar</strong></li>
              <li>Paste the URL into the <strong>Server</strong> field and tap <strong>Next</strong></li>
              <li>Tap <strong>Save</strong> in the top right</li>
              <li>Open the Calendar app — your Locum Ops shifts will appear within a few minutes</li>
            </ol>

            <Collapsible open={macOpen} onOpenChange={setMacOpen}>
              <CollapsibleTrigger asChild>
                <button className="text-sm text-primary hover:underline flex items-center gap-1 mt-2">
                  Setting up on a Mac instead?
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${macOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ol className="list-decimal pl-5 space-y-1.5 mt-2 text-foreground/90">
                  <li>Open the <strong>Calendar</strong> app on your Mac</li>
                  <li>In the menu bar, click <strong>File → New Calendar Subscription</strong></li>
                  <li>Paste the URL and click <strong>Subscribe</strong></li>
                  <li>Set <strong>Auto-refresh</strong> to <strong>Every hour</strong> for the most up-to-date sync</li>
                  <li>Click <strong>OK</strong></li>
                </ol>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Google Calendar</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Android, iPhone, or web</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div
              className="rounded-md p-3 text-xs border-l-4"
              style={{
                backgroundColor: 'hsl(var(--ochre, 36 45% 43%) / 0.1)',
                borderLeftColor: 'hsl(var(--ochre, 36 45% 43%))',
              }}
            >
              Google Calendar requires a one-time setup on a computer (laptop or desktop). The Google Calendar
              mobile app does not support adding subscribed calendars directly. Once set up on a computer,
              your shifts will appear in the Google Calendar mobile app automatically.
            </div>

            <ol className="list-decimal pl-5 space-y-1.5 text-foreground/90">
              <li>On a computer, open <strong>calendar.google.com</strong> in your browser</li>
              <li>Sign in to the Google account you want to sync to</li>
              <li>In the left sidebar, find the section labeled <strong>Other calendars</strong></li>
              <li>Click the <strong>+</strong> icon next to "Other calendars"</li>
              <li>Choose <strong>From URL</strong> from the menu</li>
              <li>Paste the Locum Ops calendar URL into the field</li>
              <li>Click <strong>Add calendar</strong></li>
              <li>Close the settings page — you'll see a confirmation</li>
              <li>
                First sync can take up to 12 hours. After that, your shifts will appear automatically in
                Google Calendar on all your devices, including the mobile app.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* TROUBLESHOOTING */}
      <Collapsible open={troubleOpen} onOpenChange={setTroubleOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <CardTitle className="text-base">My calendar isn't showing my shifts — what should I do?</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${troubleOpen ? 'rotate-180' : ''}`} />
              </CardHeader>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm">
              <ul className="list-disc pl-5 space-y-2 text-foreground/90">
                <li>First sync can take several hours, especially for Google Calendar. Wait at least 12 hours before assuming something is wrong.</li>
                <li>Make sure you pasted the entire URL with no extra spaces.</li>
                <li>Confirm the URL still works by clicking "Copy URL" again and pasting it into your browser — you should see a file download or a page of calendar data.</li>
                <li>If shifts are out of date, your calendar app hasn't refreshed yet. Open Locum Ops directly for the current schedule.</li>
                <li>Still stuck? Email <a href="mailto:support@locum-ops.com" className="text-primary hover:underline">support@locum-ops.com</a> with a screenshot.</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
