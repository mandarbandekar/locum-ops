import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play } from 'lucide-react';
import onboardingIllustration from '@/assets/onboarding-illustration.png';

const PROFESSIONS = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'vet_tech', label: 'Veterinary Technician' },
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        setError(result.error.message || 'Google sign-in failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

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

          <div className="rounded-lg border border-border bg-muted/40 py-3 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 transition-colors" onClick={resetForm}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={googleLoading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </Button>

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
