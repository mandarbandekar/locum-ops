import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play } from 'lucide-react';
import onboardingIllustration from '@/assets/onboarding-illustration.png';

const PROFESSIONS = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physician', label: 'Physician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'pt_ot', label: 'PT / OT' },
  { value: 'other', label: 'Other' },
];

export default function LoginPage() {
  const { signIn, signUp, enterDemo } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === '1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [profession, setProfession] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (isSignUp) {
      if (!firstName.trim()) { setError('First name is required'); setSubmitting(false); return; }
      if (!profession) { setError('Please select a profession'); setSubmitting(false); return; }
      const { error } = await signUp(email, password, { firstName, lastName, company, profession });
      if (error) setError(error);
      else setMessage('Account created! Please check your email to verify your account before signing in.');
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      {/* Left: form area */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-6 py-8">
          {/* Logo / brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">L</span>
              </div>
              <span className="font-[Manrope] font-bold text-lg text-foreground">LocumOps</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-[Manrope]">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSignUp ? 'Get started managing your locum business.' : 'Sign in to your LocumOps workspace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Company / Practice</Label>
                    <Input id="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Smith Veterinary LLC" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profession">Profession *</Label>
                    <Select value={profession} onValueChange={setProfession}>
                      <SelectTrigger id="profession">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                {!isSignUp && (
                  <button type="button" className="text-xs text-primary underline" onClick={() => navigate('/forgot-password')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-1">
                <p className="text-sm font-semibold text-primary">✅ Account created!</p>
                <p className="text-sm text-muted-foreground">Please check your email to verify your account before signing in.</p>
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="text-primary font-medium underline" onClick={resetForm}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" size="lg" onClick={enterDemo}>
            <Play className="mr-2 h-4 w-4" />
            Try Demo — no account needed
          </Button>
        </div>
      </div>

      {/* Right: decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 bg-muted/50 items-center justify-center p-8">
        <img
          src={onboardingIllustration}
          alt="LocumOps — manage your locum business"
          className="max-w-full max-h-[70vh] object-contain opacity-90"
        />
      </div>
    </div>
  );
}
