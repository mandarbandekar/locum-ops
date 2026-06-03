import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, Plus, X } from 'lucide-react';
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

type Tone = 'positive' | 'watchout';

function dedupeMerge(presets: readonly string[], selected: string[]): string[] {
  // Returns the union of presets + selected, preserving preset order first,
  // then any custom tags (not in presets) in selected's order.
  const lowerPresets = new Set(presets.map(p => p.toLowerCase()));
  const seen = new Set(presets.map(p => p.toLowerCase()));
  const custom: string[] = [];
  for (const t of selected) {
    const key = t.toLowerCase();
    if (lowerPresets.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    custom.push(t);
  }
  return [...presets, ...custom];
}

export function ClinicExperienceCard({ facility, onUpdate }: ClinicExperienceCardProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<string>(facility.experience_notes || '');
  const [positiveTags, setPositiveTags] = useState<string[]>(facility.experience_positive_tags || []);
  const [watchoutTags, setWatchoutTags] = useState<string[]>(facility.experience_watchout_tags || []);

  const [addingTo, setAddingTo] = useState<Tone | null>(null);
  const [draftTag, setDraftTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTo && inputRef.current) inputRef.current.focus();
  }, [addingTo]);

  const hasContent =
    (facility.experience_notes && facility.experience_notes.trim().length > 0) ||
    (facility.experience_positive_tags && facility.experience_positive_tags.length > 0) ||
    (facility.experience_watchout_tags && facility.experience_watchout_tags.length > 0);

  const toggleTag = (tag: string, tone: Tone) => {
    const setter = tone === 'positive' ? setPositiveTags : setWatchoutTags;
    setter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const commitNewTag = (tone: Tone) => {
    const trimmed = draftTag.trim().slice(0, 30);
    if (!trimmed) {
      setAddingTo(null);
      setDraftTag('');
      return;
    }
    const existing = tone === 'positive' ? positiveTags : watchoutTags;
    const presets = tone === 'positive' ? POSITIVE_TAGS : WATCHOUT_TAGS;
    const all = [...existing, ...presets];
    if (all.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      // Just select the existing one if present
      if (!existing.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
        const matched = all.find(t => t.toLowerCase() === trimmed.toLowerCase())!;
        (tone === 'positive' ? setPositiveTags : setWatchoutTags)(prev => [...prev, matched]);
      }
    } else {
      (tone === 'positive' ? setPositiveTags : setWatchoutTags)(prev => [...prev, trimmed]);
    }
    setDraftTag('');
    setAddingTo(null);
  };

  const handleSave = () => {
    onUpdate({
      ...facility,
      experience_notes: notes,
      experience_positive_tags: positiveTags,
      experience_watchout_tags: watchoutTags,
    });
    setEditing(false);
    toast.success('Saved');
  };

  const handleCancel = () => {
    setNotes(facility.experience_notes || '');
    setPositiveTags(facility.experience_positive_tags || []);
    setWatchoutTags(facility.experience_watchout_tags || []);
    setAddingTo(null);
    setDraftTag('');
    setEditing(false);
  };

  const toneClass = (tone: Tone, active: boolean) =>
    tone === 'positive'
      ? (active
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-transparent border-border text-muted-foreground')
      : (active
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          : 'bg-transparent border-border text-muted-foreground');

  const renderTagButton = (tag: string, tone: Tone) => {
    const selected = tone === 'positive' ? positiveTags : watchoutTags;
    const active = selected.includes(tag);
    return (
      <button
        type="button"
        key={tag}
        onClick={() => toggleTag(tag, tone)}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-foreground/40',
          toneClass(tone, active),
        )}
      >
        {tag}
      </button>
    );
  };

  const renderGroupEditor = (tone: Tone, label: string) => {
    const presets = tone === 'positive' ? POSITIVE_TAGS : WATCHOUT_TAGS;
    const selected = tone === 'positive' ? positiveTags : watchoutTags;
    const all = dedupeMerge(presets, selected);
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {all.map(t => renderTagButton(t, tone))}
          {addingTo === tone ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-transparent pl-2 pr-1 py-0.5">
              <input
                ref={inputRef}
                value={draftTag}
                maxLength={30}
                onChange={e => setDraftTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitNewTag(tone);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setAddingTo(null);
                    setDraftTag('');
                  }
                }}
                onBlur={() => commitNewTag(tone)}
                placeholder="New tag"
                className="bg-transparent text-xs outline-none w-24 placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setAddingTo(null); setDraftTag(''); }}
                className="text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setAddingTo(tone); setDraftTag(''); }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add tag
            </button>
          )}
        </div>
      </div>
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
            {renderGroupEditor('positive', 'What went well')}
            {renderGroupEditor('watchout', 'Watch-outs')}
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
            {(facility.experience_positive_tags?.length > 0 || facility.experience_watchout_tags?.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {(facility.experience_positive_tags || []).map((t: string) => (
                  <span key={`p-${t}`} className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs', toneClass('positive', true))}>{t}</span>
                ))}
                {(facility.experience_watchout_tags || []).map((t: string) => (
                  <span key={`w-${t}`} className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs', toneClass('watchout', true))}>{t}</span>
                ))}
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
