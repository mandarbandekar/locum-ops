import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import type { SavedTaxQuestion } from '@/hooks/useTaxAdvisor';

interface Props {
  questions: SavedTaxQuestion[];
  onSave: (q: string, topic: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<SavedTaxQuestion>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TOPICS = ['general', 'ce_travel', 'vehicle', 'credentials', 'equipment', 'retirement', 'multi_state', 'entity', 'home_office', 'advisor'];

export default function MyCPAQuestionsTab({ questions, onSave, onUpdate, onDelete }: Props) {
  const [newQ, setNewQ] = useState('');
  const [newTopic, setNewTopic] = useState('general');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = async () => {
    if (!newQ.trim()) return;
    await onSave(newQ.trim(), newTopic);
    setNewQ('');
  };

  const startEdit = (q: SavedTaxQuestion) => { setEditId(q.id); setEditText(q.question_text); };
  const cancelEdit = () => { setEditId(null); setEditText(''); };
  const saveEdit = async () => {
    if (!editId || !editText.trim()) return;
    await onUpdate(editId, { question_text: editText.trim() });
    cancelEdit();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Collect and organize questions to bring to your next CPA meeting.
      </p>

      {/* Add new */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-2">
            <Input
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="Add a question for your CPA…"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-1"
            />
            <Select value={newTopic} onValueChange={setNewTopic}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOPICS.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newQ.trim()} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No saved questions yet. Ask the advisor or add one manually above.</p>
      ) : (
        <div className="space-y-2">
          {questions.map(q => (
            <Card key={q.id}>
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <Checkbox
                  checked={q.include_in_summary}
                  onCheckedChange={v => onUpdate(q.id, { include_in_summary: !!v })}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  {editId === q.id ? (
                    <div className="flex gap-2">
                      <Input value={editText} onChange={e => setEditText(e.target.value)} className="flex-1" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                      <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{q.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.topic.replace(/_/g, ' ')} · {new Date(q.created_at).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
                {editId !== q.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
