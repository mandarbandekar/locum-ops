import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Calendar, FileText, BarChart3, Play, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Calendar, title: 'Smart Scheduling', desc: 'Manage shifts across multiple facilities with an intuitive calendar view.' },
  { icon: FileText, title: 'Invoicing', desc: 'Generate and track invoices automatically from completed shifts.' },
  { icon: BarChart3, title: 'Reports & Insights', desc: 'See earnings, hours worked, and facility activity at a glance.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' as const },
  }),
};

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
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b bg-card/80 backdrop-blur sticky top-0 z-30"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">LocumOps</span>
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
      </motion.header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4"
        >
          Locum scheduling,<br />
          <span className="text-primary">simplified.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg text-muted-foreground max-w-xl mx-auto mb-8"
        >
          Manage your facilities, shifts, confirmations, and invoices in one place — so you can focus on what matters.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button size="lg" onClick={() => navigate('/login?signup=1')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={handleDemo}>
            <Play className="mr-2 h-4 w-4" /> Try Demo
          </Button>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
            >
              <Card className="border bg-card h-full hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <f.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t py-6 text-center text-xs text-muted-foreground"
      >
        © {new Date().getFullYear()} LocumOps. Built for independent clinicians.
      </motion.footer>
    </div>
  );
}
