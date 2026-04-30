import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiFileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  /** Existing already-uploaded items (read-only display) */
  existing?: { name: string; id?: string }[];
  onRemoveExisting?: (id: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MultiFileDropzone({
  files,
  onChange,
  accept,
  disabled,
  label = 'Click to add files or drag & drop',
  hint,
  className,
  existing = [],
  onRemoveExisting,
}: MultiFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePicked = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    onChange([...files, ...Array.from(picked)]);
  };

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const hasAny = files.length > 0 || existing.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
          'hover:border-primary/50',
          disabled && 'opacity-60 pointer-events-none'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={e => {
          e.preventDefault();
          handlePicked(e.dataTransfer.files);
        }}
      >
        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => {
            handlePicked(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {hasAny && (
        <ul className="space-y-1.5">
          {existing.map((f, i) => (
            <li key={f.id ?? `existing-${i}`} className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{f.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">already uploaded</span>
              </div>
              {onRemoveExisting && f.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={e => { e.stopPropagation(); onRemoveExisting(f.id!); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
          {files.map((f, i) => (
            <li key={`new-${i}`} className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{f.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(f.size)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={e => { e.stopPropagation(); removeAt(i); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
