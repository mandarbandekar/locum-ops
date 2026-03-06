import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Stethoscope, Calendar, FileText, BarChart3, Play, ArrowRight } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Smart Scheduling', desc: 'Manage shifts across multiple clinics with an intuitive calendar view.' },
  { icon: FileText, title: 'Invoicing', desc: 'Generate and track invoices automatically from completed shifts.' },
  { icon: BarChart3, title: 'Reports & Insights', desc: 'See earnings, hours worked, and clinic activity at a glance.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useAuth();

  const handleDemo = () => {
    enterDemo();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">ReliefOps</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/login?signup=1')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
          Relief vet scheduling,<br />
          <span className="text-primary">simplified.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Manage your clinics, shifts, confirmations, and invoices in one place — so you can focus on what matters.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/login?signup=1')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={handleDemo}>
            <Play className="mr-2 h-4 w-4" /> Try Demo
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border bg-card">
              <CardContent className="pt-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ReliefOps. Built for relief veterinarians.
      </footer>
    </div>
  );
}
