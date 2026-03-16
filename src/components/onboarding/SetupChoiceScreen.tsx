import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, PenLine, Sparkles } from 'lucide-react';
import type { CurrentTool } from '@/contexts/UserProfileContext';

interface Props {
  currentTools: CurrentTool[];
  onChooseImport: () => void;
  onChooseManual: () => void;
}

function getRecommendation(tools: CurrentTool[]): 'import' | 'manual' {
  const importTools: CurrentTool[] = ['sheets_excel', 'calendar', 'quickbooks', 'wave', 'freshbooks'];
  return tools.some(t => importTools.includes(t)) ? 'import' : 'manual';
}

export function SetupChoiceScreen({ currentTools, onChooseImport, onChooseManual }: Props) {
  const recommended = getRecommendation(currentTools);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-[Manrope]">How do you want to get started?</h2>
        <p className="text-muted-foreground mt-1">Choose the path that fits your workflow.</p>
      </div>

      <div className="space-y-3">
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            recommended === 'import' ? 'border-primary ring-1 ring-primary/20' : ''
          }`}
          onClick={onChooseImport}
        >
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Bring in what you already use</h3>
                  {recommended === 'import' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Import from spreadsheets, contracts, calendars, and notes using the AI Setup Assistant.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            recommended === 'manual' ? 'border-primary ring-1 ring-primary/20' : ''
          }`}
          onClick={onChooseManual}
        >
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Add your first practice manually</h3>
                  {recommended === 'manual' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Quick setup — add a practice and a shift to get started in minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
