import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function WaitlistPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [facilityCount, setFacilityCount] = useState('');
  const [headache, setHeadache] = useState('');
  const [error, setError] = useState('');

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email.'); return; }
    if (!profession) { setError('Please select your profession.'); return; }
    setError('');
    setStep(2);
  };

  const handleStepTwo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityCount) { setError('Please select how many facilities you work with.'); return; }
    setError('');

    const payload = { email, profession, facilityCount, headache, timestamp: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('locumops_waitlist') || '[]');
    existing.push(payload);
    localStorage.setItem('locumops_waitlist', JSON.stringify(existing));
    console.log('waitlist_submit', payload);
    navigate('/quiz');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-bold text-lg text-foreground tracking-tight">LocumOps</Link>
          <div />
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-md mx-auto px-4 py-16">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => step === 2 ? setStep(1) : navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {step === 1 ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Get early access to LocumOps</h1>
            <p className="text-muted-foreground mb-8 text-sm">We'll invite waitlist users in small batches.</p>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleStepOne} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Profession *</Label>
                    <Select value={profession} onValueChange={setProfession}>
                      <SelectTrigger><SelectValue placeholder="Select profession" /></SelectTrigger>
                      <SelectContent>
                        {['Vet', 'Nurse', 'Physician', 'Pharmacist', 'PT/OT', 'Other'].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">Continue</Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Just two more questions</h1>
            <p className="text-muted-foreground mb-8 text-sm">Help us tailor LocumOps for you.</p>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleStepTwo} className="space-y-5">
                  <div className="space-y-2">
                    <Label>How many facilities do you work with? *</Label>
                    <RadioGroup value={facilityCount} onValueChange={setFacilityCount} className="flex gap-4">
                      {['1–3', '4–6', '6+'].map(v => (
                        <div key={v} className="flex items-center gap-1.5">
                          <RadioGroupItem value={v} id={`fc-${v}`} />
                          <Label htmlFor={`fc-${v}`} className="text-sm font-normal cursor-pointer">{v}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="headache">What's the #1 admin headache of managing your own relief business you want solved?</Label>
                    <Textarea id="headache" rows={3} placeholder="e.g. Chasing payments, tracking credentials..." value={headache} onChange={e => setHeadache(e.target.value)} />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">Join the waitlist</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  );
}
