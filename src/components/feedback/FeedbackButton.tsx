import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isDemo } = useAuth();

  if (!user && !isDemo) return null;
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
        aria-label="Send feedback"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
