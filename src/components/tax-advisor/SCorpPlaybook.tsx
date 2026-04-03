import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Save, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PLAYBOOK_SECTIONS } from '@/lib/scorpAssessment';
import { toast } from 'sonner';

interface Props {
  onSaveQuestion: (q: string, topic: string) => Promise<void>;
}

export default function SCorpPlaybook({ onSaveQuestion }: Props) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set());

  const toggle = (i: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleSave = async (q: string) => {
    await onSaveQuestion(q, 'S-Corp');
    setSavedQuestions(prev => new Set(prev).add(q));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">S-Corp Educational Playbook</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Reference guide covering S-Corp fundamentals. This is educational information — consult your CPA before making any decisions.
      </p>

      {PLAYBOOK_SECTIONS.map((section, i) => (
        <Collapsible key={i} open={openSections.has(i)} onOpenChange={() => toggle(i)}>
          <Card className="border">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">{i + 1}</Badge>
                  <span className="font-medium text-sm">{section.title}</span>
                </div>
                {openSections.has(i) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 px-4 space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-strong:text-foreground prose-li:leading-relaxed">
                  {section.content.split('\n').map((line, li) => {
                    if (line.startsWith('- **')) {
                      const match = line.match(/^- \*\*(.+?)\*\* — (.+)$/);
                      if (match) return <div key={li} className="flex gap-2 py-0.5"><span className="font-semibold text-foreground shrink-0">• {match[1]}</span><span>— {match[2]}</span></div>;
                    }
                    if (line.trim() === '') return <div key={li} className="h-2" />;
                    return <p key={li} className="my-1 leading-relaxed">{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
                  })}
                </div>

                {section.cpaQuestions.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">CPA Questions from this section:</p>
                    <div className="space-y-1.5">
                      {section.cpaQuestions.map((q, qi) => (
                        <div key={qi} className="flex items-start justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">"{q}"</span>
                          {savedQuestions.has(q) ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={() => handleSave(q)}>
                              <Save className="h-3 w-3 mr-1" /> Save
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
