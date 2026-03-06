import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Minus, XCircle } from 'lucide-react';

export default function ResultsPage() {
  const navigate = useNavigate();
  const [score, setScore] = useState<number>(0);
  const [phone, setPhone] = useState('');
  const [earlyOnboarding, setEarlyOnboarding] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('locumops_quiz') || '{}');
    setScore(data.score || 0);
  }, []);

  const tier = score >= 12 ? 'high' : score >= 8 ? 'medium' : 'low';

  useEffect(() => {
    console.log('quiz_result', { tier, score });
  }, [tier, score]);

  const handleContinue = () => {
    if (tier === 'high' && phone) {
      const existing = JSON.parse(localStorage.getItem('locumops_quiz') || '{}');
      existing.phone = phone;
      existing.earlyOnboarding = earlyOnboarding;
      localStorage.setItem('locumops_quiz', JSON.stringify(existing));
    }
    navigate('/thanks');
  };

  const config = {
    high: {
      icon: CheckCircle, color: 'text-primary',
      headline: "You're exactly who LocumOps is built for.",
      body: "You're managing a real business across facilities. LocumOps will replace your spreadsheet workflow for confirmations, invoicing, and getting paid—without the chaos.",
      cta: 'Finish',
    },
    medium: {
      icon: Minus, color: 'text-warning',
      headline: 'LocumOps can help — want early access?',
      body: "LocumOps will simplify your facility tracking, confirmations, and invoicing. Join the waitlist and we'll invite you when your cohort opens.",
      cta: 'Continue',
    },
    low: {
      icon: XCircle, color: 'text-muted-foreground',
      headline: "You might need a different kind of tool — still want updates?",
      body: "If you're mostly working through an agency or facility system, you may not need LocumOps yet. But we'd love to keep you in the loop.",
      cta: 'Keep me updated',
    },
  }[tier];

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-bold text-lg text-foreground tracking-tight">LocumOps</Link>
          <div />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-md mx-auto px-4 py-16 text-center">
        <Icon className={`h-12 w-12 mx-auto mb-4 ${config.color}`} />
        <h1 className="text-2xl font-bold text-foreground mb-3">{config.headline}</h1>
        <p className="text-muted-foreground mb-8">{config.body}</p>

        {tier === 'high' && (
          <Card className="mb-6 text-left">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="early" checked={earlyOnboarding} onCheckedChange={v => setEarlyOnboarding(!!v)} />
                <Label htmlFor="early" className="text-sm font-normal cursor-pointer">I want early onboarding</Label>
              </div>
            </CardContent>
          </Card>
        )}

        <Button size="lg" onClick={handleContinue}>
          {config.cta} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
