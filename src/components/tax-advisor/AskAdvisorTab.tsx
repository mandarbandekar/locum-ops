import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Save, Loader2, Lightbulb, Building2, Briefcase } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { TaxAdvisorProfile, TaxAdvisorSession } from '@/hooks/useTaxAdvisor';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  profile: TaxAdvisorProfile | null;
  sessions: TaxAdvisorSession[];
  onSaveSession: (prompt: string, response: string, title?: string) => Promise<TaxAdvisorSession | null>;
  onSaveQuestion: (q: string, topic: string, sessionId?: string) => Promise<void>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tax-advisor-chat`;

const PROMPT_CHIPS = [
  { label: 'CE & travel deductions', prompt: 'What CE and travel expenses can I typically deduct as a relief veterinarian? What documentation do I need?' },
  { label: 'Vehicle mileage strategies', prompt: 'What are the best strategies for tracking and deducting vehicle mileage as a locum professional?' },
  { label: 'S-Corp vs sole proprietor', prompt: 'What are the pros and cons of operating as an S-Corp vs sole proprietor for locum work? At what income level should I consider switching?' },
  { label: 'Retirement account options', prompt: 'What retirement account options are available to me as a self-employed relief professional? What are the contribution limits and deadlines?' },
  { label: 'Multi-state filing', prompt: 'I work in multiple states. What are my filing obligations and how should I track income by state?' },
  { label: 'Home office rules', prompt: 'Can I deduct a home office if I do administrative work from home for my locum practice? What are the requirements?' },
];

export default function AskAdvisorTab({ profile, sessions, onSaveSession, onSaveQuestion }: Props) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { facilities } = useData();

  const buildUserContext = () => {
    if (!profile) return undefined;
    return {
      entityType: profile.entity_type,
      travelsForCE: profile.travels_for_ce,
      usesPersonalVehicle: profile.uses_personal_vehicle,
      multiStateWork: profile.multi_state_work,
      paysOwnSubscriptions: profile.pays_own_subscriptions,
      retirementInterest: profile.retirement_planning_interest,
      combinesTravel: profile.combines_business_personal_travel,
      buysSupplies: profile.buys_supplies_equipment,
      facilityCount: facilities?.length || 0,
    };
  };

  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || input).trim();
    if (!prompt || streaming) return;
    setInput('');
    setCurrentPrompt(prompt);
    setCurrentResponse('');
    setSavedSessionId(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          userContext: buildUserContext(),
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setCurrentResponse(full);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setCurrentResponse('Sorry, something went wrong. Please try again.');
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleSaveSession = async () => {
    if (!currentPrompt || !currentResponse) return;
    const session = await onSaveSession(currentPrompt, currentResponse);
    if (session) setSavedSessionId(session.id);
  };

  const extractCPAQuestions = (text: string): string[] => {
    const section = text.split(/##\s*Questions to Ask Your CPA/i)[1];
    if (!section) return [];
    return section.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./)).map(l => l.replace(/^[-\d.)\s]+/, '').trim()).filter(Boolean);
  };

  const profileComplete = profile != null;
  const facilityCount = facilities?.length || 0;
  const entityLabel = profile?.entity_type?.replace(/_/g, ' ') || null;

  return (
    <div className="space-y-4">
      {/* Profile nudge */}
      {!profileComplete && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Get personalized suggestions</span> — complete your planning profile in the sidebar to unlock tailored advice.
          </p>
        </div>
      )}

      {/* Quick-start prompt chips */}
      {!currentPrompt && !streaming && (
        <div>
          <p className="text-sm font-medium mb-2">Quick topics</p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_CHIPS.map(chip => (
              <Button
                key={chip.label}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => handleSend(chip.prompt)}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Context chips — show what we know */}
      {(facilityCount > 0 || entityLabel) && !currentPrompt && (
        <div className="flex flex-wrap gap-1.5">
          {facilityCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <Building2 className="h-3 w-3" /> {facilityCount} {facilityCount === 1 ? 'facility' : 'facilities'}
            </Badge>
          )}
          {entityLabel && (
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <Briefcase className="h-3 w-3" /> {entityLabel}
            </Badge>
          )}
        </div>
      )}

      {/* Current conversation */}
      {(currentPrompt || currentResponse) && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-sm font-medium text-primary mb-1">You asked:</p>
              <p className="text-sm">{currentPrompt}</p>
            </div>
            {currentResponse && (
              <div className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-base prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-2 prose-headings:border-b prose-headings:border-border prose-headings:pb-1.5
                prose-p:leading-relaxed prose-p:text-muted-foreground
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-ul:my-2 prose-ol:my-2
                prose-strong:text-foreground prose-strong:font-semibold
                first:prose-headings:mt-0">
                <ReactMarkdown>{currentResponse}</ReactMarkdown>
              </div>
            )}
            {!streaming && currentResponse && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={handleSaveSession} disabled={!!savedSessionId}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {savedSessionId ? 'Saved' : 'Save Session'}
                </Button>
                {extractCPAQuestions(currentResponse).map((q, i) => (
                  <Button key={i} size="sm" variant="ghost" className="text-xs"
                    onClick={() => onSaveQuestion(q, 'advisor', savedSessionId || undefined)}>
                    Save: "{q.slice(0, 40)}…"
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about CE travel, vehicle use, retirement topics, subscriptions, or other locum tax-planning questions…"
              className="min-h-[60px] resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || streaming} size="icon" className="shrink-0 h-[60px] w-[60px]">
              {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Past Sessions</h3>
          {sessions.slice(0, 10).map(s => (
            <Card key={s.id} className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { setCurrentPrompt(s.prompt); setCurrentResponse(s.response); setSavedSessionId(s.id); }}>
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium truncate">{s.title || s.prompt.slice(0, 80)}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
