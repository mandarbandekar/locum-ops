import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Save, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { TaxAdvisorProfile, TaxAdvisorSession } from '@/hooks/useTaxAdvisor';
import { useData } from '@/contexts/DataContext';

interface Props {
  profile: TaxAdvisorProfile | null;
  sessions: TaxAdvisorSession[];
  onSaveSession: (prompt: string, response: string, title?: string) => Promise<TaxAdvisorSession | null>;
  onSaveQuestion: (q: string, topic: string, sessionId?: string) => Promise<void>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tax-advisor-chat`;

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

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const prompt = input.trim();
    setInput('');
    setCurrentPrompt(prompt);
    setCurrentResponse('');
    setSavedSessionId(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

  return (
    <div className="space-y-4">
      {/* Current conversation */}
      {(currentPrompt || currentResponse) && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-sm font-medium text-primary mb-1">You asked:</p>
              <p className="text-sm">{currentPrompt}</p>
            </div>
            {currentResponse && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
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
            <Button onClick={handleSend} disabled={!input.trim() || streaming} size="icon" className="shrink-0 h-[60px] w-[60px]">
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
