import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { profile, updateProfile } = useUserProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Authenticated users (e.g. Google OAuth) should never see the signup form.
  useEffect(() => {
    if (!user) return;
    if (profile && !profile.has_seen_welcome) {
      updateProfile({ has_seen_welcome: true });
    }
    navigate('/onboarding', { replace: true });
  }, [user, profile, updateProfile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: '',
      profession: 'vet',
    });
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSuccess(true);
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-foreground/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-[hsl(var(--card-border))] p-8 sm:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">L</span>
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">Locum Ops</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it to activate your account.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full mt-2" size="lg">
              Go to login
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-7 leading-tight">
              Create your Locum Ops account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full uppercase tracking-wide" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign up'}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
              By signing up, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a> and{' '}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>

            <div className="mt-6 pt-5 border-t border-[hsl(var(--card-border))] text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
