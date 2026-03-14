import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, FileText, CalendarDays, StickyNote, SkipForward, Upload, Loader2, Check } from 'lucide-react';
import { ImportLane, useSetupAssistant } from '@/hooks/useSetupAssistant';

interface SetupAssistantLanesProps {
  onComplete: (entities: any[]) => void;
  onSkip: () => void;
  hookState: ReturnType<typeof useSetupAssistant>;
}

type LaneStatus = 'idle' | 'uploading' | 'done';

export function SetupAssistantLanes({ onComplete, onSkip, hookState }: SetupAssistantLanesProps) {
  const { processing, entities, uploadFile, uploadAndParse } = hookState;
  const [laneStatuses, setLaneStatuses] = useState<Record<ImportLane, LaneStatus>>({
    facilities: 'idle',
    contracts: 'idle',
    shifts: 'idle',
  });
  const [pasteMode, setPasteMode] = useState<ImportLane | null>(null);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeLane, setActiveLane] = useState<ImportLane | null>(null);

  const handleFileSelect = async (lane: ImportLane, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLaneStatuses(prev => ({ ...prev, [lane]: 'uploading' }));
    for (const file of Array.from(files)) {
      await uploadFile(file, lane);
    }
    setLaneStatuses(prev => ({ ...prev, [lane]: 'done' }));
  };

  const handlePasteSubmit = async (lane: ImportLane) => {
    if (!pasteText.trim()) return;
    setLaneStatuses(prev => ({ ...prev, [lane]: 'uploading' }));
    await uploadAndParse(lane, pasteText, 'Pasted text');
    setLaneStatuses(prev => ({ ...prev, [lane]: 'done' }));
    setPasteMode(null);
    setPasteText('');
  };

  const triggerFileInput = (lane: ImportLane) => {
    setActiveLane(lane);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const anyDone = Object.values(laneStatuses).some(s => s === 'done');

  const lanes: { lane: ImportLane; icon: any; title: string; desc: string; accept: string }[] = [
    {
      lane: 'facilities',
      icon: FileSpreadsheet,
      title: 'Upload spreadsheet / CSV',
      desc: 'Import facilities, contacts, and rates',
      accept: '.csv,.xlsx,.xls,.tsv,.txt',
    },
    {
      lane: 'contracts',
      icon: FileText,
      title: 'Upload contracts or docs',
      desc: 'Extract terms, rates, and policies',
      accept: '.pdf,.doc,.docx,.txt',
    },
    {
      lane: 'shifts',
      icon: CalendarDays,
      title: 'Upload calendar / schedule',
      desc: 'Import upcoming shifts from ICS or CSV',
      accept: '.ics,.csv,.txt',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Bring in what you already use</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Upload spreadsheets, contracts, and calendars. LocumOps will organize your facilities, terms, and shifts for review.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={activeLane ? lanes.find(l => l.lane === activeLane)?.accept : '*'}
        multiple
        onChange={e => {
          if (activeLane) handleFileSelect(activeLane, e.target.files);
          e.target.value = '';
        }}
      />

      <div className="space-y-3">
        {lanes.map(({ lane, icon: Icon, title, desc }) => {
          const status = laneStatuses[lane];
          return (
            <Card key={lane} className={status === 'done' ? 'border-primary/40' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent p-2">
                      <Icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {status === 'done' && <Badge variant="outline" className="text-primary border-primary/40"><Check className="h-3 w-3 mr-1" /> Done</Badge>}
                    {status === 'idle' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => triggerFileInput(lane)} disabled={processing}>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPasteMode(pasteMode === lane ? null : lane)} disabled={processing}>
                          <StickyNote className="h-3.5 w-3.5 mr-1" /> Paste
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {pasteMode === lane && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder={
                        lane === 'facilities' ? 'Paste facility names, addresses, rates...' :
                        lane === 'contracts' ? 'Paste contract text or key terms...' :
                        'Paste schedule information...'
                      }
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setPasteMode(null); setPasteText(''); }}>Cancel</Button>
                      <Button size="sm" onClick={() => handlePasteSubmit(lane)} disabled={!pasteText.trim() || processing}>
                        {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Process
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-2">
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <SkipForward className="h-3.5 w-3.5" /> Skip for now
        </button>
        {anyDone && (
          <Button onClick={() => onComplete(entities)}>
            Review Results
          </Button>
        )}
      </div>
    </div>
  );
}
