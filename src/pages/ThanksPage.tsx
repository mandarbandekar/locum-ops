import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Copy, Linkedin, Facebook, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ThanksPage() {
  const waitlistUrl = `${window.location.origin}/waitlist`;
  const shareText = 'Check out LocumOps — a back-office OS for independent clinicians.';

  const copyLink = () => {
    navigator.clipboard.writeText(waitlistUrl);
    toast.success('Link copied!');
  };

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(waitlistUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(waitlistUrl)}&quote=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-bold text-lg text-foreground tracking-tight">LocumOps</Link>
          <div />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-md mx-auto px-4 py-20 text-center">
        <CheckCircle className="h-14 w-14 text-primary mx-auto mb-5" />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">You're on the list.</h1>
        <p className="text-muted-foreground mb-8">Thanks for helping shape LocumOps. Want to share it with another independent clinician?</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" /> Copy waitlist link
          </Button>
          <Button variant="outline" asChild>
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
              <Linkedin className="h-4 w-4 mr-2" /> Share on LinkedIn
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
              <Facebook className="h-4 w-4 mr-2" /> Share on Facebook
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">We'll invite waitlist users in small batches.</p>
      </motion.div>
    </div>
  );
}
