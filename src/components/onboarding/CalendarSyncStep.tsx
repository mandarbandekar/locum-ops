import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Smartphone, Download, ArrowRight, Calendar } from 'lucide-react';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Check, Copy } from 'lucide-react';

interface Props {
  onContinue: () => void;
}

export function CalendarSyncStep({ onContinue }: Props) {
  const { generateFeedToken, feedToken, getFeedUrl, exportIcs, connectGoogle } = useCalendarSync();
  const [selectedOption, setSelectedOption] = useState<'google' | 'ical' | 'export' | null>(null);
  const [copied, setCopied] = useState(false);

  const feedUrl = getFeedUrl();

  const handleGenerateIcal = async () => {
    setSelectedOption('ical');
    if (!feedToken) {
      await generateFeedToken();
    }
  };

  const handleCopy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('Subscription link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    setSelectedOption('export');
    exportIcs('next_30');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">
          Keep your shifts in sync with your calendar
        </h2>
        <p className="text-muted-foreground mt-1">
          See upcoming booked shifts in the calendar you already use.
        </p>
      </div>

      <div className="space-y-3">
        {/* Apple / iCal */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/40 ${
            selectedOption === 'ical' ? 'border-primary bg-primary/[0.03]' : 'border-border'
          }`}
          onClick={handleGenerateIcal}
        >
          <CardContent className="py-4 px-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Subscribe with Apple Calendar / iCal</p>
              <p className="text-xs text-muted-foreground mt-0.5">Subscribe to a read-only LocumOps calendar</p>
              {selectedOption === 'ical' && feedUrl && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input readOnly value={feedUrl} className="text-xs font-mono h-8" />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste this URL in Apple Calendar → File → New Calendar Subscription.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Download Calendar File */}
        <Card
          className={`cursor-pointer transition-all hover:border-primary/40 ${
            selectedOption === 'export' ? 'border-primary bg-primary/[0.03]' : 'border-border'
          }`}
          onClick={handleExport}
        >
          <CardContent className="py-4 px-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Download Calendar File</p>
              <p className="text-xs text-muted-foreground mt-0.5">Download a .ics file for Google Calendar or any other calendar app</p>
              {selectedOption === 'export' && (
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> File downloaded
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar - Coming Soon */}
        <Card className="opacity-60 cursor-default">
          <CardContent className="py-4 px-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-muted-foreground">Google Calendar Sync</p>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming Soon</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Direct sync with Google Calendar is coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onContinue} className="w-full" size="lg">
        {selectedOption ? 'Continue' : 'Skip for now'} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
