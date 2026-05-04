import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useAuth } from '@/contexts/AuthContext';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isDemo } = useAuth();

  if (!user && !isDemo) return null;
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] h-14 w-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 hover:shadow-lg"
        style={{ backgroundColor: '#1A5C6B', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
