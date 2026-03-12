import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, Building2, DollarSign, CalendarDays, Receipt, RotateCcw,
  Clock, Shield, TrendingUp, Briefcase, CheckCircle2,
  BarChart3, Menu, X, ArrowRight, Sparkles, Zap
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

/* ─── animation helpers ─── */
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } } };

function Anim({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: 'easeOut' } } }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── email capture ─── */
function EmailCapture({ source = 'landing_hero', showPersona = false }: { source?: string; showPersona?: boolean }) {
  const [email, setEmail] = useState('');
  const [persona, setPersona] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrMsg('Please enter a valid email.'); return; }
    setStatus('loading');
    setErrMsg('');
    const { error } = await supabase.from('waitlist_leads').insert({ email, persona, source_page: source });
    if (error) { setStatus('error'); setErrMsg('Something went wrong. Please try again.'); }
    else setStatus('success');
  };

  if (status === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground">You're on the list!</p>
          <p className="text-sm text-muted-foreground">We'll reach out with early access details soon.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
          className="flex-1 h-12 rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={status === 'loading'}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-60 whitespace-nowrap">
          {status === 'loading' ? 'Submitting…' : 'Join Early Access'}
        </button>
      </div>
      {showPersona && (
        <select value={persona} onChange={e => setPersona(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">I'm a… (optional)</option>
          <option value="relief_vet">Relief Veterinarian</option>
          <option value="clinic_owner">Clinic Owner</option>
          <option value="other">Other</option>
        </select>
      )}
      {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}
      {!showPersona && <p className="text-xs text-muted-foreground">Get product updates, early access, and founding-user perks. No spam.</p>}
    </form>
  );
}

/* ─── product mockup ─── */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/40">
          <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive/60" /><div className="w-2.5 h-2.5 rounded-full bg-warning/60" /><div className="w-2.5 h-2.5 rounded-full bg-success/60" /></div>
          <div className="flex-1 flex justify-center"><div className="h-5 w-40 rounded-md bg-muted text-[10px] flex items-center justify-center text-muted-foreground">app.locumops.com</div></div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'This Month', value: '$8,450', icon: DollarSign, color: 'text-primary' },
              { label: 'Upcoming Shifts', value: '6', icon: CalendarDays, color: 'text-primary' },
              { label: 'Pending Invoices', value: '3', icon: Receipt, color: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border/40 bg-background p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border/40 bg-background p-3">
            <p className="text-[11px] font-semibold text-foreground mb-2">Upcoming Shifts</p>
            {[
              { clinic: 'Valley Animal Hospital', date: 'Mon, Mar 16', rate: '$950/day', status: 'Confirmed' },
              { clinic: 'Coastal Vet Partners', date: 'Wed, Mar 18', rate: '$1,100/day', status: 'Confirmed' },
              { clinic: 'Sunrise Pet Clinic', date: 'Fri, Mar 20', rate: '$900/day', status: 'Pending' },
            ].map(s => (
              <div key={s.clinic} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-[11px] font-medium text-foreground">{s.clinic}</p>
                  <p className="text-[10px] text-muted-foreground">{s.date} · {s.rate}</p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'Confirmed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      {[
        { text: 'Contract Ready', icon: FileText, pos: '-top-3 -left-4 sm:-left-8', delay: 0.6 },
        { text: 'Invoice Sent', icon: Receipt, pos: 'top-16 -right-3 sm:-right-6', delay: 0.8 },
        { text: 'Rate Confirmed', icon: DollarSign, pos: 'bottom-20 -left-3 sm:-left-6', delay: 1.0 },
        { text: 'Clinic Saved', icon: Building2, pos: '-bottom-2 right-4', delay: 1.2 },
      ].map(b => (
        <motion.div key={b.text} initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: b.delay }}
          className={`absolute ${b.pos} flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg shadow-primary/5 z-10`}>
          <b.icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{b.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── section wrapper ─── */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-16 sm:py-24 px-4 sm:px-6 ${className}`}>{children}</section>;
}

/* ─── navbar ─── */
function Navbar({ scrollTo }: { scrollTo: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'Product', id: 'features' },
    { label: 'How It Works', id: 'solution' },
    { label: 'Benefits', id: 'benefits' },
    { label: 'FAQ', id: 'faq' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-foreground">Locum Ops</span>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
          ))}
        </nav>
        <div className="hidden md:block">
          <button onClick={() => scrollTo('waitlist-cta')}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
            Join Waitlist
          </button>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden border-t border-border/40 bg-background px-4 pb-4">
          {links.map(l => (
            <button key={l.id} onClick={() => { scrollTo(l.id); setOpen(false); }}
              className="block w-full text-left py-3 text-sm font-medium text-muted-foreground hover:text-foreground">{l.label}</button>
          ))}
          <button onClick={() => { scrollTo('waitlist-cta'); setOpen(false); }}
            className="mt-2 w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Join Waitlist</button>
        </motion.div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════ PAGE ═══════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const trustChips = ['Contracts', 'Rates', 'Clinic Info', 'Scheduling', 'Invoicing', 'Credentials', 'Tax Estimates'];

  const painCards = [
    { icon: FileText, title: 'Contracts buried in docs & email', desc: 'Agreements scattered across Gmail, Google Drive, and random folders with no easy way to find or track them.' },
    { icon: Building2, title: 'Clinic info scattered everywhere', desc: 'Door codes, PIMS systems, contact info — living in texts, notes, and memory instead of one reliable place.' },
    { icon: Receipt, title: 'Invoicing done manually every time', desc: 'Rebuilding invoices from scratch, chasing payments, and losing track of what\'s been paid and what hasn\'t.' },
    { icon: RotateCcw, title: 'Repeat shifts with no clean system', desc: 'Going back to the same clinic but re-looking up rates, contacts, and logistics each time.' },
  ];

  const features = [
    { icon: FileText, title: 'Contract Templates', desc: 'Store, track, and manage every agreement in one organized vault.', visual: '📋' },
    { icon: Building2, title: 'Rate & Clinic Manager', desc: 'Every clinic\'s details, rates, and contacts — saved and searchable.', visual: '🏥' },
    { icon: CalendarDays, title: 'Shift Tracker', desc: 'See your upcoming schedule at a glance across all clinics.', visual: '📅' },
    { icon: Receipt, title: 'Auto Invoice Workflow', desc: 'Generate, send, and track invoices with built-in follow-up.', visual: '⚡' },
    { icon: BarChart3, title: 'Reports & Tax Dashboard', desc: 'Track earnings, deductions, and quarterly tax estimates.', visual: '📊' },
    { icon: RotateCcw, title: 'Repeat Booking System', desc: 'Streamline recurring shifts with saved clinic workflows.', visual: '🔄' },
  ];

  const outcomes = [
    { icon: Clock, title: 'Save hours on admin', desc: 'Stop rebuilding spreadsheets and chasing details. Everything lives in one place.' },
    { icon: Shield, title: 'Reduce missed details', desc: 'No more forgotten rates, lost contacts, or overlooked contract terms.' },
    { icon: Briefcase, title: 'Look more professional', desc: 'Send polished invoices, organized packets, and timely communications.' },
    { icon: TrendingUp, title: 'Build a scalable practice', desc: 'Create repeatable systems that grow with your relief business.' },
  ];

  const faqs = [
    { q: 'Who is Locum Ops for?', a: 'Locum Ops is built for independent relief veterinarians who want a single platform to manage their contracts, clinic relationships, scheduling, invoicing, and business operations.' },
    { q: 'Is the platform live now?', a: 'We\'re currently in development and onboarding early access users. Join the waitlist to be among the first to use the platform when it launches.' },
    { q: 'What happens after I join the waitlist?', a: 'You\'ll receive product updates, early access invitations, and founding-user perks. We\'ll never spam you — only meaningful updates.' },
    { q: 'Will Locum Ops include templates and workflows?', a: 'Yes. Locum Ops will include contract templates, invoice templates, clinic onboarding checklists, and repeatable workflow tools built specifically for relief practice.' },
    { q: 'Is this only for veterinarians?', a: 'We\'re starting with relief veterinarians, but the platform is designed to support any independent locum professional — including nurses, physicians, and allied health providers.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar scrollTo={scrollTo} />

      {/* ─── HERO ─── */}
      <Section className="pt-12 sm:pt-20 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <Anim>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.1] tracking-tight text-foreground">
                  Run your locum relief practice{' '}
                  <span className="text-primary">like a business.</span>
                </h1>
              </Anim>
              <Anim delay={0.1}>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Contracts, clinic details, rates, scheduling, auto invoicing, credential management and tax guidance — finally in one place.
                </p>
              </Anim>
              <Anim delay={0.15}>
                <p className="text-sm text-muted-foreground/80 italic">
                  Built by a relief vet who understands the reality of balancing clinical work with the back-office chaos behind it.
                </p>
              </Anim>
              <Anim delay={0.2}>
                <EmailCapture source="landing_hero" />
              </Anim>
            </div>
            <Anim delay={0.15} className="hidden lg:block">
              <ProductMockup />
            </Anim>
          </div>

          {/* Trust chips */}
          <Anim delay={0.3} className="mt-14 flex flex-wrap gap-3 justify-center">
            {trustChips.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />{c}
              </span>
            ))}
          </Anim>
        </div>
      </Section>

      {/* ─── PROBLEM ─── */}
      <Section className="bg-muted/30" id="problem">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Most relief vets are running a real business<br className="hidden sm:block" /> on scattered tools.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-5">
            {painCards.map(c => (
              <motion.div key={c.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-6 hover:shadow-lg hover:shadow-primary/5 transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── SOLUTION ─── */}
      <Section id="solution">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The Solution</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              One operating system for your<br className="hidden sm:block" /> locum relief business.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From first clinic contact to signed agreement to getting paid — Locum Ops keeps your work organized.
            </p>
          </Anim>
          <Anim className="rounded-2xl border border-border/40 bg-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
              {['Inquiry', 'Agreement', 'Shift', 'Invoice', 'Payment'].map((step, i) => (
                <div key={step} className="flex items-center gap-3 sm:gap-0 sm:flex-col">
                  <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{step}</span>
                  </div>
                  {i < 4 && <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground mx-4 shrink-0" />}
                </div>
              ))}
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── FEATURES ─── */}
      <Section className="bg-muted/30" id="features">
        <div className="max-w-6xl mx-auto">
          <Anim className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything you need to run your relief practice.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <motion.div key={f.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-6 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-2xl">{f.visual}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── BENEFITS ─── */}
      <Section id="benefits">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Outcomes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Less admin. More clarity.<br className="hidden sm:block" /> More professional growth.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-5">
            {outcomes.map(o => (
              <motion.div key={o.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-6 flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{o.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── FOUNDER ─── */}
      <Section className="bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <Anim>
            <div className="rounded-2xl border border-border/40 bg-card p-8 sm:p-10 text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">From the Founder</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-5">Built from real relief experience.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Locum Ops is being built by a relief veterinarian who knows firsthand how hard it is to manage contracts, scheduling, invoicing, clinic communication, and admin — while still showing up fully for patients and clinics. The platform is designed from real operational pain, not from the outside looking in.
              </p>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── SOCIAL PROOF ─── */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for the next generation of<br className="hidden sm:block" /> independent relief veterinarians.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Building2, stat: 'Organize', desc: 'Every clinic in one place' },
              { icon: Zap, stat: 'Standardize', desc: 'Repeat workflows across clinics' },
              { icon: TrendingUp, stat: 'Scale', desc: 'Build a more sustainable practice' },
            ].map(s => (
              <motion.div key={s.stat} variants={scaleIn}
                className="rounded-2xl border border-border/40 bg-card p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{s.stat}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── WAITLIST CTA ─── */}
      <Section id="waitlist-cta">
        <div className="max-w-2xl mx-auto">
          <Anim>
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 to-primary/10 p-8 sm:p-12 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Get early access to Locum Ops.</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Be first in line for the platform built to simplify and professionalize independent relief work.
              </p>
              <div className="max-w-md mx-auto">
                <EmailCapture source="landing_cta" showPersona />
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section className="bg-muted/30" id="faq">
        <div className="max-w-2xl mx-auto">
          <Anim className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Frequently asked questions</h2>
          </Anim>
          <Anim delay={0.1}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/40 bg-card px-5 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-4">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Anim>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-foreground text-lg">Locum Ops</span>
            <p className="text-xs text-muted-foreground mt-1">Built for independent relief practice.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Locum Ops. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
import { useState, useRef } from 'react';
import locumOpsLogo from '@/assets/locumops-logo.png';

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

/* ─── Section wrapper with scroll animation ─── */
function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeIn}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Reusable section header ─── */
function SectionHeader({ label, title, subtitle, center = true }: { label?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`mb-12 ${center ? 'text-center' : ''}`}>
      {label && (
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
          {label}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ─── Interactive stat card ─── */
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="bg-muted/40 rounded-lg p-2.5 cursor-default group hover:bg-muted/60 hover:shadow-md transition-colors duration-200"
    >
      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${color} transition-transform duration-200 group-hover:scale-110 origin-left`}>{value}</p>
    </motion.div>
  );
}

/* ─── Product mockup component ─── */
function ProductMockup() {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayStates = [
    { filled: true, label: 'Sunrise Animal', color: 'bg-primary/20 border-primary/30' },
    { filled: false, label: '', color: 'bg-muted/50 border-transparent' },
    { filled: true, label: 'Valley Pet Clinic', color: 'bg-warning/15 border-warning/25' },
    { filled: true, label: 'Coastal Vet ER', color: 'bg-primary/20 border-primary/30' },
    { filled: false, label: '', color: 'bg-muted/50 border-transparent' },
  ];

  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-3xl blur-2xl"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-muted/30">
          <motion.div whileHover={{ scale: 1.4 }} className="w-2.5 h-2.5 rounded-full bg-destructive/60 cursor-pointer" />
          <motion.div whileHover={{ scale: 1.4 }} className="w-2.5 h-2.5 rounded-full bg-warning/60 cursor-pointer" />
          <motion.div whileHover={{ scale: 1.4 }} className="w-2.5 h-2.5 rounded-full bg-success/60 cursor-pointer" />
          <span className="ml-3 text-[10px] text-muted-foreground font-medium">Locum Ops — Dashboard</span>
        </div>
        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Top row stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Upcoming Shifts" value="12" color="text-primary" />
            <StatCard label="Pending Invoices" value="$8,420" color="text-warning" />
            <StatCard label="Active Contracts" value="6" color="text-success" />
          </div>
          {/* Calendar preview */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-muted/30 rounded-lg p-3 cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-foreground">March 2026</span>
              <span className="text-[9px] text-muted-foreground">Week View</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {days.map((d, i) => (
                <div key={d} onMouseEnter={() => setHoveredDay(i)} onMouseLeave={() => setHoveredDay(null)}>
                  <p className="text-[8px] text-muted-foreground text-center mb-1">{d}</p>
                  <motion.div
                    animate={{
                      scale: hoveredDay === i ? 1.08 : 1,
                      y: hoveredDay === i ? -2 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={`h-10 rounded border transition-shadow duration-200 ${dayStates[i].color} ${hoveredDay === i ? 'shadow-md' : ''}`}
                  >
                    {dayStates[i].filled && hoveredDay === i && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[7px] font-medium text-foreground/70 px-1 pt-1 truncate"
                      >
                        {dayStates[i].label}
                      </motion.p>
                    )}
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>
          {/* Credential status */}
          <motion.div
            whileHover={{ scale: 1.02, x: 2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5 cursor-default group"
          >
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
              <Shield className="h-3.5 w-3.5 text-success" />
            </motion.div>
            <span className="text-[10px] text-foreground font-medium">Credentialing</span>
            <div className="flex-1" />
            <span className="text-[9px] bg-success/15 text-success px-2 py-0.5 rounded-full font-medium group-hover:bg-success/25 transition-colors">8/9 Complete</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Hero with parallax ─── */
function HeroSection({ onScrollTo, onNavigate }: { onScrollTo: (id: string) => void; onNavigate: (path: string) => void }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.3]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  return (
    <section ref={heroRef} className="relative overflow-hidden">
      {/* Parallax gradient background */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
      <motion.div style={{ y: bgY, scale: glowScale }} className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      {/* Dark mode animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-0 dark:opacity-100"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
        }}
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-0 dark:opacity-100"
        style={{
          background: 'radial-gradient(circle, hsl(173 58% 39% / 0.08) 0%, hsl(215 25% 15% / 0.05) 60%, transparent 80%)',
        }}
        animate={{ x: [0, -50, 40, 0], y: [0, 30, -50, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-0 dark:opacity-100"
        style={{
          background: 'radial-gradient(circle, hsl(173 58% 50% / 0.06) 0%, transparent 70%)',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, 50, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy with parallax */}
          <motion.div style={{ y: textY }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-6 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15">
                <Zap className="h-3 w-3" /> Now in Early Access
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-foreground leading-[1.1] mb-6"
            >
              The operating system for{' '}
              <span className="text-primary">locum work</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              Locum Ops helps locum professionals and individual providers simplify scheduling, contracts, rates, credentialing, auto invoicing, and everyday operations — all in one place.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-start gap-3"
            >
              <Button size="lg" onClick={() => onScrollTo('platform')} className="shadow-md px-6">
                Explore the Platform <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => onScrollTo('segments')} className="px-6">
                Find Your Segment <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Product Mockup with parallax */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            style={{ y: mockupY }}
            className="hidden lg:block"
          >
            <ProductMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Landing Page ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useAuth();
  const handleDemo = () => { enterDemo(); navigate('/'); };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background scroll-smooth antialiased">
      {/* ═══════════ HEADER ═══════════ */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src={locumOpsLogo} alt="Locum Ops" className="h-8 w-8" />
            <span className="font-bold text-lg text-foreground tracking-tight">Locum Ops</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo('platform')} className="hover:text-foreground transition-colors">Platform</button>
            <button onClick={() => scrollTo('segments')} className="hover:text-foreground transition-colors">Solutions</button>
            <button onClick={() => scrollTo('resources')} className="hover:text-foreground transition-colors">Resources</button>
            <button onClick={() => scrollTo('mission')} className="hover:text-foreground transition-colors">About</button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground" onClick={() => navigate('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => navigate('/waitlist')} className="shadow-sm">
              Get Early Access
            </Button>
            <MobileMenu onNavigate={navigate} onScrollTo={scrollTo} onDemo={handleDemo} />
          </div>
        </div>
      </motion.header>

      <HeroSection onScrollTo={scrollTo} onNavigate={navigate} />

      {/* ═══════════ 2. SEGMENT SELECTOR ═══════════ */}
      <AnimatedSection id="segments" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeader
          label="Solutions"
          title="Built for independent locum professionals"
        />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        >
          {[
            
            { icon: Stethoscope, title: 'Relief Veterinarians', desc: 'Organize shifts, rates, contracts, and payments', color: 'text-teal-600 dark:text-teal-400' },
            { icon: Briefcase, title: 'Nurse Practitioners & PAs', desc: 'Streamline assignments, credentialing, and billing', color: 'text-blue-600 dark:text-blue-400' },
            { icon: Heart, title: 'Physicians & Surgeons', desc: 'Manage locum contracts and operations across facilities', color: 'text-rose-600 dark:text-rose-400' },
            { icon: Syringe, title: 'CRNAs & Allied Health', desc: 'Track certifications, shifts, and invoicing in one place', color: 'text-purple-600 dark:text-purple-400' },
            { icon: SmilePlus, title: 'Dentists', desc: 'Simplify scheduling, credentialing, and practice admin', color: 'text-orange-600 dark:text-orange-400' },
          ].map((s, i) => (
            <motion.div key={s.title} custom={i} variants={fadeUp}
              className="group relative bg-card border border-border/60 rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer"
            >
              <div className={`w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1.5">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ═══════════ 3. PROBLEM ═══════════ */}
      <div className="bg-muted/30">
        <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <SectionHeader
            label="The Problem"
            title="Locum work is flexible. The admin behind it usually isn't."
            subtitle="Locum workflows are often spread across emails, spreadsheets, PDFs, and disconnected tools — creating gaps, delays, and unnecessary friction."
          />
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {[
              { icon: FolderOpen, title: 'Contracts scattered', desc: 'Across email threads and shared drives' },
              { icon: ClipboardCheck, title: 'Credentialing manual', desc: 'Tracked in spreadsheets or not at all' },
              { icon: Calendar, title: 'Scheduling fragmented', desc: 'Between texts, calls, and calendars' },
              { icon: DollarSign, title: 'Invoicing easy to miss', desc: 'No system to track what is sent or owed' },
              { icon: Settings2, title: 'No unified system', desc: 'For rates, terms, and operations' },
            ].map((p, i) => (
              <motion.div key={p.title} custom={i} variants={fadeUp}
                className="bg-card border border-border/60 rounded-xl p-5 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-destructive/8 flex items-center justify-center mx-auto mb-3">
                  <p.icon className="h-5 w-5 text-destructive/70" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 4. PLATFORM ═══════════ */}
      <AnimatedSection id="platform" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeader
          label="Platform"
          title="One place to run the business side of locum work"
          subtitle="Six integrated modules that cover every operational workflow — from assignment to payment."
        />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {[
            { icon: Calendar, title: 'Assignments & Scheduling', desc: 'Calendar views, shift management, conflict detection, and multi-date booking across facilities.', preview: ['Mon – Valley Clinic', 'Wed – Metro Health', 'Fri – Coastal Vet'] },
            { icon: FileText, title: 'Contracts & Rate Management', desc: 'Store weekday, weekend, and holiday rates. Track contract terms, renewals, and cancellation policies.', preview: ['Weekday: $85/hr', 'Weekend: $110/hr', 'Holiday: $140/hr'] },
            { icon: Shield, title: 'Credentialing & Compliance', desc: 'Track licenses, DEA, insurance, CE credits, and renewal deadlines with automated status tracking.', preview: ['✓ State License', '✓ DEA Registration', '⚠ Insurance — 14d'] },
            { icon: CircleDollarSign, title: 'Invoices & Payments', desc: 'Generate invoices from completed shifts, track sent/paid status, and manage accounts receivable.', preview: ['INV-2026-012: $3,400', 'INV-2026-011: Paid ✓', 'INV-2026-010: Overdue'] },
            { icon: Workflow, title: 'Workflow Templates', desc: 'Standardize onboarding checklists, operational SOPs, and repeatable processes across facilities.', preview: ['☑ W-9 submitted', '☑ Background check', '☐ Orientation complete'] },
            { icon: BarChart3, title: 'Insights & Benchmarks', desc: 'Track earnings, shift volume, facility performance, and tax set-aside progress in real time.', preview: ['YTD Revenue: $68,400', 'Avg Rate: $92/hr', 'Tax Reserve: 31%'] },
          ].map((f, i) => (
            <motion.div key={f.title} custom={i} variants={fadeUp}
              className="group bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="p-6">
                <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
              {/* Mini UI preview */}
              <div className="px-6 pb-5">
                <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                  {f.preview.map((line, j) => (
                    <div key={j} className="text-[11px] text-muted-foreground font-mono">{line}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ═══════════ 5. WORKFLOW ═══════════ */}
      <div className="bg-muted/30">
        <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <SectionHeader
            label="Workflow"
            title="From opportunity to payment — finally in one workflow"
          />
          <div className="flex flex-wrap justify-center gap-2 sm:gap-0">
            {[
              { label: 'Opportunity', icon: Zap },
              { label: 'Assignment', icon: Calendar },
              { label: 'Contract', icon: FileText },
              { label: 'Credentialing', icon: Shield },
              { label: 'Shift Completion', icon: CheckCircle2 },
              { label: 'Invoice', icon: CircleDollarSign },
              { label: 'Payment', icon: DollarSign },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-3 sm:px-5">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-sm border transition-colors ${
                    i === arr.length - 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/60 text-muted-foreground'
                  }`}>
                    <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-foreground text-center whitespace-nowrap">{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 6. OUTCOMES ═══════════ */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeader
          label="Outcomes"
          title="Less admin. More clarity. Better operations."
        />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-3 gap-6"
        >
          {[
            { icon: Clock, title: 'Save time', desc: 'Eliminate repetitive admin tasks by centralizing scheduling, invoicing, and credentialing into automated workflows.', stat: '10+ hrs', statLabel: 'saved per month' },
            { icon: FolderOpen, title: 'Stay organized', desc: 'One source of truth for contracts, credentials, rates, and facility details — always current, always accessible.', stat: '100%', statLabel: 'visibility' },
            { icon: TrendingUp, title: 'Get paid with confidence', desc: 'Track every invoice from creation to payment. Know exactly what is outstanding and follow up faster.', stat: '<48h', statLabel: 'faster AR cycles' },
          ].map((o, i) => (
            <motion.div key={o.title} custom={i} variants={fadeUp}
              className="bg-card border border-border/60 rounded-xl p-8 text-center hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <o.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-0.5">{o.stat}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">{o.statLabel}</div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{o.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ═══════════ 7. AUDIENCE SPLIT ═══════════ */}
      <div className="bg-muted/30">
        <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <SectionHeader
            label="Who It's For"
            title="Purpose-built for independent locum professionals"
            subtitle="Locum Ops is designed first and foremost for independent locums who run their own practice — giving you the back-office infrastructure you need without the overhead."
          />
          <div className="max-w-2xl mx-auto">
            {/* Independent Locums */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/25 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 shadow-sm flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">For Independent Locums</h3>
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Built for you</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Run the business side of your clinical career with professional-grade tools built for one. No team required — just you and a smarter system.</p>
                <ul className="space-y-3 sm:columns-2">
                  {[
                    'Manage your own schedule and availability',
                    'Track credentials and renewal deadlines',
                    'Auto generate invoices and follow up on payment',
                    'Store contracts and rate terms per facility',
                    'Track earnings, tax set-asides, and business metrics',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground break-inside-avoid">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 8. MISSION ═══════════ */}
      <AnimatedSection id="mission" className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <SectionHeader
          label="Our Mission"
          title="Locum work has evolved. The systems behind it haven't."
          subtitle="Flexible clinical work is the fastest-growing segment in healthcare staffing. But the operational tools behind it haven't kept pace. Locum Ops is purpose-built to modernize the workflows behind flexible clinical work — for independent professionals who run their own practice."
        />
        <Button size="lg" variant="outline" onClick={() => navigate('/waitlist')} className="px-6">
          Join the Movement <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AnimatedSection>

      {/* ═══════════ 9. FOUNDER STORY ═══════════ */}
      <div className="bg-muted/30">
        <AnimatedSection className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

            <div className="flex flex-col lg:flex-row gap-10 items-start">
              {/* Left: text content */}
              <div className="flex-1 space-y-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Our Story</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  Founded by someone who knows the pain firsthand
                </h2>
                <div className="border-l-2 border-primary/30 pl-5 space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    Locum Ops is being built by an independent locum medical professional who experiences the back-office burden of locum work every day.
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    Managing contracts, scheduling, credentialing, invoicing, and business operations often requires jumping between multiple apps, spreadsheets, emails, and documents just to keep everything moving.
                  </p>
                  <p className="text-foreground leading-relaxed text-[15px] font-medium">
                    Locum Ops is being created from that firsthand frustration — to make the business side of locum work simpler, more organized, and built for the way locum professionals actually work.
                  </p>
                </div>
              </div>

              {/* Right: icon cluster graphic */}
              <div className="lg:w-80 w-full shrink-0">
                <div className="relative">
                  {/* "Before" scattered tools */}
                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {[
                      { icon: FileText, label: 'Contracts' },
                      { icon: Calendar, label: 'Calendars' },
                      { icon: Shield, label: 'Credentials' },
                      { icon: DollarSign, label: 'Invoices' },
                      { icon: FolderOpen, label: 'Spreadsheets' },
                      { icon: Settings2, label: 'Apps' },
                    ].map((tool, i) => (
                      <motion.div
                        key={tool.label}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 + 0.2 }}
                        className="bg-muted/60 border border-border/40 rounded-lg p-2.5 text-center hover:border-destructive/30 transition-colors"
                      >
                        <tool.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <span className="text-[10px] text-muted-foreground">{tool.label}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Arrow / transition */}
                  <div className="flex items-center justify-center gap-2 py-3">
                    <div className="h-px flex-1 bg-border" />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </motion.div>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* "After" unified platform */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/20 rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <img src={locumOpsLogo} alt="Locum Ops" className="h-5 w-5" />
                      <span className="font-bold text-foreground text-sm">Locum Ops</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Everything in one place</p>
                    <div className="flex justify-center gap-1.5 mt-3">
                      {[Calendar, FileCheck, Shield, DollarSign, BarChart3].map((Icon, i) => (
                        <div key={i} className="w-6 h-6 rounded bg-card shadow-sm flex items-center justify-center">
                          <Icon className="h-3 w-3 text-primary" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 10. RESOURCES ═══════════ */}
      <div className="border-t border-border/40">
        <AnimatedSection id="resources" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <SectionHeader
            label="Resources"
            title="Resources for modern locum professionals"
          />
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { icon: FileText, title: 'How to Build a Strong Locum Contract', tag: 'Guide', desc: 'Key terms, red flags, and a framework for protecting your rates and cancellation policies.' },
              { icon: ClipboardCheck, title: 'Credentialing Checklist', tag: 'Template', desc: 'A comprehensive checklist covering licenses, DEA, insurance, and onboarding documents.' },
              { icon: CircleDollarSign, title: 'How to Set Your Locum Rates', tag: 'Guide', desc: 'Market benchmarks, negotiation tips, and structuring weekday vs. weekend pricing.' },
              { icon: BookOpen, title: 'Operations Templates & Admin Guides', tag: 'Toolkit', desc: 'Shift confirmation templates, invoice workflows, and admin SOPs you can use today.' },
            ].map((r, i) => (
              <motion.div key={r.title} custom={i} variants={fadeUp}
                className="bg-card border border-border/60 rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <r.icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{r.tag}</span>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2 group-hover:text-primary transition-colors">{r.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 10. FINAL CTA ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground dark:from-card dark:via-card dark:to-card" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <AnimatedSection className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-background dark:text-foreground tracking-tight leading-tight mb-4">
            A better operating system for locum work is coming
          </h2>
          <p className="text-background/70 dark:text-muted-foreground text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Explore the platform, find your segment, and see how Locum Ops can simplify the business side of locum work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/waitlist')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-6">
              Get Early Access <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo('platform')}
              className="border-background/20 text-background hover:bg-background/10 dark:border-border dark:text-foreground dark:hover:bg-muted px-6"
            >
              Explore the Platform
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={locumOpsLogo} alt="Locum Ops" className="h-6 w-6 opacity-60" />
              <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Locum Ops. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Mobile Menu ─── */
function MobileMenu({ onNavigate, onScrollTo, onDemo }: { onNavigate: (path: string) => void; onScrollTo: (id: string) => void; onDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const go = (fn: () => void) => { fn(); setOpen(false); };
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(!open)} className="p-1.5 text-muted-foreground hover:text-foreground">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-0 right-0 bg-card border-b shadow-xl z-40 px-6 py-5 space-y-3"
        >
          <button onClick={() => go(() => onScrollTo('platform'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Platform</button>
          <button onClick={() => go(() => onScrollTo('segments'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Solutions</button>
          <button onClick={() => go(() => onScrollTo('resources'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Resources</button>
          <button onClick={() => go(() => onScrollTo('mission'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">About</button>
          <hr className="border-border" />
          <button onClick={() => go(() => onNavigate('/login'))} className="block w-full text-left text-sm text-foreground font-medium">Sign In</button>
          <button onClick={() => go(onDemo)} className="block w-full text-left text-sm text-foreground font-medium">Try Demo</button>
        </motion.div>
      )}
    </div>
  );
}
