import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClinicExperienceCardProps {
  facility: any;
  onUpdate: (f: any) => void;
}

const POSITIVE_TAGS = [
  'Friendly staff',
  'Well-equipped',
  'Organized records',
  'Reasonable caseload',
  'Good lunch break',
  'Pays on time',
] as const;

const WATCHOUT_TAGS = [
  'Understaffed',
  'Heavy caseload',
  'Clunky PIMS',
  'Disorganized',
  'Slow payer',
  'Poor handoff',
] as const;

export function ClinicExperienceCard({ facility, onUpdate }: ClinicExperienceCardProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<string>(facility.experience_notes || '');
  const [tags, setTags] = useState<string[]>(facility.experience_tags || []);

  const hasContent = (facility.experience_notes && facility.experience_notes.trim().length > 0) ||
    (facility.experience_tags && facility.experience_tags.length > 0);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = () => {
    onUpdate({ ...facility, experience_notes: notes, experience_tags: tags });
    setEditing(false);
    toast.success('Saved');
  };

  const handleCancel = () => {
    setNotes(facility.experience_notes || '');
    setTags(facility.experience_tags || []);
    setEditing(false);
  };

  const renderTag = (tag: string, tone: 'positive' | 'watchout', interactive: boolean) => {
    const active = tags.includes(tag);
    const base = 'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors';
    const toneClass = tone === 'positive'
      ? (active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-transparent border-border text-muted-foreground')
      : (active ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' : 'bg-transparent border-border text-muted-foreground');
    if (!interactive) {
      return <span key={tag} className={cn(base, toneClass)}>{tag}</span>;
    }
    return (
      <button
        type="button"
        key={tag}
        onClick={() => toggleTag(tag)}
        className={cn(base, toneClass, 'hover:border-foreground/40')}
      >
        {tag}
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Notes</CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        ) : hasContent ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">What went well</p>
              <div className="flex flex-wrap gap-1.5">
                {POSITIVE_TAGS.map(t => renderTag(t, 'positive', true))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Watch-outs</p>
              <div className="flex flex-wrap gap-1.5">
                {WATCHOUT_TAGS.map(t => renderTag(t, 'watchout', true))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Notes</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                placeholder="What stood out this visit? What would future-you want to know before coming back?"
              />
            </div>
          </div>
        ) : hasContent ? (
          <div className="space-y-3">
            {facility.experience_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {facility.experience_tags.map((t: string) => {
                  const isPositive = (POSITIVE_TAGS as readonly string[]).includes(t);
                  return renderTag(t, isPositive ? 'positive' : 'watchout', false);
                })}
              </div>
            )}
            {facility.experience_notes && (
              <p className="text-sm whitespace-pre-wrap break-words">{facility.experience_notes}</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add notes about your experience here</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
