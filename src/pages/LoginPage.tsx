import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Play } from 'lucide-react';

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
      else setMessage('Account created! Check your email to verify your address, then sign in.');
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
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">LocumOps</CardTitle>
            <CardDescription>{isSignUp ? 'Create your account' : 'Independent clinician management'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company / Practice</Label>
                    <Input id="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Smith Veterinary LLC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession *</Label>
                    <Select value={profession} onValueChange={setProfession}>
                      <SelectTrigger id="profession">
                        <SelectValue placeholder="Select your profession" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
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
              {message && <p className="text-sm text-green-600">{message}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button type="button" className="text-primary underline" onClick={resetForm}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-muted px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Want to explore first? Try the demo with sample data — no account needed.
            </p>
            <Button variant="outline" className="w-full" onClick={enterDemo}>
              <Play className="mr-2 h-4 w-4" />
              Try Demo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
