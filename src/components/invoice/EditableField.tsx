import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Pencil, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Resolved value to display (override ?? source). */
  value: string;
  /** Source/fallback value (profile or facility). Shown as placeholder when value is empty. */
  sourceValue?: string;
  /** Whether the current value is from an override (so we can offer "Reset"). */
  isOverridden?: boolean;
  /** Editing enabled. */
  editable: boolean;
  /** Called with the new value, or null to reset to source. */
  onChange: (next: string | null) => void | Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  /** Tailwind classes for the displayed text wrapper. */
  className?: string;
  /** Hidden label for screen readers. */
  ariaLabel: string;
  /** Optional input type (e.g. 'date', 'email'). Ignored when multiline. */
  inputType?: string;
}

export function EditableField({
  value, sourceValue, isOverridden, editable, onChange,
  multiline, placeholder, className, ariaLabel, inputType,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    const next = trimmed === (sourceValue || '').trim() ? null : trimmed;
    setEditing(false);
    if (trimmed !== (value || '').trim()) {
      await onChange(next);
    }
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
    if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
  };

  if (!editable) {
    return value ? (
      <span className={cn('whitespace-pre-line break-words', className)}>{value}</span>
    ) : (
      <span className={cn('text-muted-foreground/60 italic', className)}>{placeholder || '—'}</span>
    );
  }

  if (editing) {
    const common = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: any) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown,
      placeholder: placeholder || sourceValue || '',
      className: cn(
        'w-full rounded-[6px] border border-[hsl(var(--input-focus-border))] bg-[hsl(var(--input-bg))] px-2 py-1 text-inherit shadow-[0_0_0_3px_hsl(var(--input-focus-ring))] outline-none',
        className,
      ),
    };
    return multiline
      ? <textarea rows={3} {...common} />
      : <input type={inputType || 'text'} {...common} />;
  }

  const displayed = value || placeholder || sourceValue || '';
  const isPlaceholder = !value;

  return (
    <span className="group/edit inline-flex items-start gap-1 max-w-full">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={cn(
          'text-left rounded-[4px] -mx-1 px-1 -my-0.5 py-0.5 cursor-text',
          'hover:bg-primary/[0.06] hover:ring-1 hover:ring-primary/30',
          'focus-visible:bg-primary/[0.06] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:outline-none',
          'transition-colors whitespace-pre-line break-words',
          isPlaceholder && 'text-muted-foreground/60 italic',
          className,
        )}
      >
        {displayed}
        <Pencil className="inline-block ml-1 h-3 w-3 opacity-0 group-hover/edit:opacity-60 align-baseline" />
      </button>
      {isOverridden && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          title="Reset to default"
          className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-foreground p-0.5"
        >
          <Undo2 className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
