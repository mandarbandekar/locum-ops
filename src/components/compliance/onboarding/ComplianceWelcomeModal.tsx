import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileCheck, Bell, Search } from 'lucide-react';

interface Props {
  open: boolean;
  onGetStarted: () => void;
  onSkip: () => void;
}

const VALUE_BULLETS = [
  { icon: ShieldCheck, text: 'Track licenses and registrations' },
  { icon: FileCheck, text: 'Upload CE certificates and key documents' },
  { icon: Bell, text: 'Get reminded before renewals are due' },
  { icon: Search, text: "See what's missing before renewal time" },
];

export function ComplianceWelcomeModal({ open, onGetStarted, onSkip }: Props) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()}>
        <div className="p-8 space-y-6">
          <div className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Stay ahead of licenses, CE, and renewals</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Keep all your credentials in one place, track expirations, upload supporting documents, and see exactly what needs attention next.
            </p>
          </div>

          <div className="space-y-3">
            {VALUE_BULLETS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <Button className="w-full" size="lg" onClick={onGetStarted}>
              Get started
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
              Skip for now
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Setup only takes a few minutes — you can finish the rest later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
