import { useState } from 'react';
import { SettingsNav } from '@/components/SettingsNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Trash2, AlertTriangle, Shield, Lock, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DELETE_REASONS = [
  { value: 'no_longer_doing_locum', label: "I'm no longer doing locum work" },
  { value: 'switched_to_another_tool', label: 'I switched to another tool' },
  { value: 'too_complicated', label: 'The app was too complicated' },
  { value: 'missing_features', label: "It didn't have the features I need" },
  { value: 'privacy_concerns', label: 'Privacy / data concerns' },
  { value: 'other', label: 'Other reason' },
];

type Step = 'confirm' | 'survey' | 'final';

export default function SettingsAccountPage() {
  const { user, isDemo, signOut } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [step, setStep] = useState<Step>('confirm');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const openDelete = () => {
    setStep('confirm');
    setReason('');
    setFeedback('');
    setConfirmText('');
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' });
        return;
      }

      const res = await supabase.functions.invoke('delete-account', {
        body: {
          reason: DELETE_REASONS.find(r => r.value === reason)?.label || reason,
          feedback,
        },
      });

      if (res.error) throw res.error;

      toast({ title: 'Account deleted', description: 'Your account and all data have been permanently removed.' });
      // Sign out client-side (session is already invalid server-side)
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Delete account error:', err);
      toast({ title: 'Deletion failed', description: err?.message || 'Please try again or contact support.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <SettingsNav />
      <div className="page-header">
        <h1 className="page-title">Account</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your login and account preferences.
      </p>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Login</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="text-sm font-medium">{isDemo ? 'demo@locumops.com' : user?.email || '—'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              To change your login email, contact support.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Session</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Delete My Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data including facilities, shifts, invoices, credentials, and settings. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={openDelete}
              disabled={isDemo}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete my account
            </Button>
            {isDemo && (
              <p className="text-xs text-muted-foreground">Account deletion is not available in demo mode.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> We're sorry to see you go
                </DialogTitle>
                <DialogDescription>
                  Before you leave, would you mind telling us why? Your feedback helps us improve LocumOps for everyone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <RadioGroup value={reason} onValueChange={setReason}>
                  {DELETE_REASONS.map(r => (
                    <div key={r.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={r.value} id={r.value} />
                      <Label htmlFor={r.value} className="text-sm cursor-pointer">{r.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="space-y-1.5">
                  <Label htmlFor="feedback" className="text-sm">Anything else you'd like us to know? (optional)</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="What could we have done better?"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => setStep('final')} disabled={!reason}>
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'final' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Confirm permanent deletion
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all data. This action is irreversible. Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
                  <p className="font-medium text-destructive">The following will be permanently removed:</p>
                  <ul className="text-muted-foreground text-xs list-disc pl-4 space-y-0.5">
                    <li>All clinics, contacts & contracts</li>
                    <li>All shifts and schedule data</li>
                    <li>All invoices, payments & billing records</li>
                    <li>All credentials, documents & CE entries</li>
                    <li>Tax settings, reminders & preferences</li>
                    <li>Calendar sync connections</li>
                    <li>Your account login</li>
                  </ul>
                </div>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="font-mono"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setStep('confirm')}>Back</Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE' || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting…' : 'Permanently delete account'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
