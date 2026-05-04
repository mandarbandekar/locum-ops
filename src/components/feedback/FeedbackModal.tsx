import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, Upload, X } from 'lucide-react';

type FeedbackType = 'bug' | 'feature' | 'confusion' | 'other';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Idea' },
  { value: 'confusion', label: 'Confusion' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setType('bug');
      setDescription('');
      setFile(null);
      setSubmitting(false);
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => onOpenChange(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success, onOpenChange]);

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Screenshot must be under 5MB');
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be signed in to submit feedback');
      return;
    }
    if (description.trim().length < 3) {
      toast.error('Please add a short description');
      return;
    }
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('feedback-screenshots')
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        screenshot_url = path;
      }

      const { error } = await supabase.from('feedback_submissions').insert({
        user_id: user.id,
        user_email: user.email ?? null,
        type,
        description: description.trim(),
        screenshot_url,
        page_url: window.location.pathname + window.location.search,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {success ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12" style={{ color: '#5EA87A' }} />
            <h3 className="text-lg font-semibold">Thank you for your feedback</h3>
            <p className="text-sm text-muted-foreground">We will put this in our priority list.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send feedback</DialogTitle>
              <DialogDescription>Bug, idea, or just confused? All three are useful.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      type === t.value
                        ? 'text-white border-transparent'
                        : 'bg-transparent border-border text-foreground hover:bg-muted'
                    )}
                    style={type === t.value ? { backgroundColor: '#1A5C6B' } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="What happened? What were you trying to do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />

              <div>
                {file ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg text-sm">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    <span>Attach screenshot (optional, max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || description.trim().length < 3}
                className="w-full text-white"
                style={{ backgroundColor: '#1A5C6B' }}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
