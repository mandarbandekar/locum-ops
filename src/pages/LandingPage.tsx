import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Easing } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, Building2, DollarSign, CalendarDays, Receipt, RotateCcw,
  Clock, Shield, TrendingUp, Briefcase, CheckCircle2,
  BarChart3, Menu, X, ArrowRight, Sparkles, Zap, ShieldCheck
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import locumOpsLogo from '@/assets/locumops-logo.png';

/* ─── animation helpers ─── */
const easeOut: Easing = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } } };

function Anim({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: easeOut } } }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── email capture (two-step) ─── */
function EmailCapture({ source = 'landing_hero', showPersona = false }: { source?: string; showPersona?: boolean }) {
  const [email, setEmail] = useState('');
  const [persona, setPersona] = useState('');
  const [facilityCount, setFacilityCount] = useState('');
  const [headache, setHeadache] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrMsg('Please enter a valid email.'); return; }
    setErrMsg('');
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrMsg('');
    const { error } = await supabase.from('waitlist_leads').insert({
      email,
      persona,
      facility_count: facilityCount,
      headache: headache.slice(0, 1000),
      source_page: source,
    });
    if (error) { setStatus('error'); setErrMsg('Something went wrong. Please try again.'); }
    else setStatus('success');
  };

  if (status === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5">
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground">You're on the list!</p>
          <p className="text-sm text-muted-foreground">We'll reach out with early access details soon.</p>
        </div>
      </motion.div>
    );
  }

  if (step === 2) {
    return (
      <motion.form onSubmit={handleStep2} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="space-y-5">
        <p className="text-sm font-medium text-foreground">Almost there! Two quick questions:</p>

        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">How many facilities do you work with?</p>
          <div className="flex gap-2.5">
            {['1-3', '4-6', '6+'].map(opt => (
              <button key={opt} type="button" onClick={() => setFacilityCount(opt)}
                className={`h-10 px-5 rounded-xl border text-sm font-medium transition-all duration-150 ${facilityCount === opt
                  ? 'border-primary bg-primary/10 text-primary shadow-soft'
                  : 'border-input bg-card text-foreground hover:bg-muted'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">What's the #1 admin headache you want solved?</p>
          <textarea value={headache} onChange={e => setHeadache(e.target.value)} rows={3} maxLength={1000}
            placeholder="e.g. chasing late payments, tracking credentials…"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 resize-none transition-colors" />
        </div>

        {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}

        <button type="submit" disabled={status === 'loading'}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-all duration-150 disabled:opacity-60 active:scale-[0.98]">
          {status === 'loading' ? 'Submitting…' : 'Join the Waitlist'}
        </button>
      </motion.form>
    );
  }

  return (
    <form onSubmit={handleStep1} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
          className="flex-1 h-12 rounded-xl border border-input bg-card px-4 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 transition-colors" />
        <button type="submit"
          className="h-12 px-7 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-all duration-150 whitespace-nowrap active:scale-[0.98] shadow-soft">
          Join Early Access
        </button>
      </div>
      {showPersona && (
        <select value={persona} onChange={e => setPersona(e.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors">
          <option value="">I'm a… (optional)</option>
          <option value="relief_vet">Relief Veterinarian</option>
          <option value="pa">Physician Assistant</option>
          <option value="np">Nurse Practitioner</option>
          <option value="other">Other Locum Professional</option>
        </select>
      )}
      {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}
      {!showPersona && <p className="text-[13px] text-muted-foreground">Get product updates, early access, and founding-user perks. No spam.</p>}
    </form>
  );
}

/* ─── product mockup ─── */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-5 w-44 rounded-lg bg-muted text-[10px] flex items-center justify-center text-muted-foreground font-medium">
              app.locumops.com
            </div>
          </div>
        </div>
        {/* Dashboard content */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'This Month', value: '$8,450', icon: DollarSign, accent: 'text-primary' },
              { label: 'Upcoming Shifts', value: '6', icon: CalendarDays, accent: 'text-primary' },
              { label: 'Pending Invoices', value: '3', icon: Receipt, accent: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <s.icon className={`h-3.5 w-3.5 ${s.accent}`} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground leading-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Upcoming Shifts</p>
            {[
              { clinic: 'Valley Animal Hospital', date: 'Mon, Mar 16', rate: '$950/day', status: 'Confirmed' },
              { clinic: 'Coastal Vet Partners', date: 'Wed, Mar 18', rate: '$1,100/day', status: 'Confirmed' },
              { clinic: 'Sunrise Pet Clinic', date: 'Fri, Mar 20', rate: '$900/day', status: 'Pending' },
            ].map(s => (
              <div key={s.clinic} className="flex items-center justify-between py-2 border-b border-border-soft last:border-0">
                <div>
                  <p className="text-[12px] font-medium text-foreground">{s.clinic}</p>
                  <p className="text-[11px] text-muted-foreground">{s.date} · {s.rate}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${s.status === 'Confirmed' ? 'chip-success' : 'chip-warning'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      {/* Floating badges */}
      {[
        { text: 'Contract Ready', icon: FileText, pos: '-top-3 -left-4 sm:-left-8', delay: 0.6 },
        { text: 'Invoice Sent', icon: Receipt, pos: 'top-20 -right-3 sm:-right-6', delay: 0.8 },
        { text: 'Rate Confirmed', icon: DollarSign, pos: 'bottom-24 -left-3 sm:-left-6', delay: 1.0 },
        { text: 'Credential Valid', icon: ShieldCheck, pos: '-bottom-2 right-6', delay: 1.2 },
      ].map(b => (
        <motion.div key={b.text} initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: b.delay }}
          className={`absolute ${b.pos} flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-card z-10`}>
          <b.icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{b.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── section wrapper ─── */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-20 sm:py-28 px-5 sm:px-8 ${className}`}>{children}</section>;
}

/* ─── navbar ─── */
function Navbar({ scrollTo, hideSignIn = false }: { scrollTo: (id: string) => void; hideSignIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'Product', id: 'features' },
    { label: 'How It Works', id: 'solution' },
    { label: 'Benefits', id: 'benefits' },
    { label: 'FAQ', id: 'faq' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <img src={locumOpsLogo} alt="LocumOps" className="h-7 w-7 rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-foreground font-display">Locum Ops</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">{l.label}</button>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          {!hideSignIn && <Link to="/login" className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">Sign In</Link>}
          <button onClick={() => scrollTo('waitlist-cta')}
            className="h-9 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-150 active:scale-[0.98] shadow-soft">
            Join Waitlist
          </button>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden border-t border-border/40 bg-card px-5 pb-5">
          {links.map(l => (
            <button key={l.id} onClick={() => { scrollTo(l.id); setOpen(false); }}
              className="block w-full text-left py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
          ))}
          {!hideSignIn && <Link to="/login" onClick={() => setOpen(false)}
            className="block w-full text-left py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>}
          <button onClick={() => { scrollTo('waitlist-cta'); setOpen(false); }}
            className="mt-3 w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-soft">Join Waitlist</button>
        </motion.div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════ PAGE ═══════════════════════════════════ */
export default function LandingPage({ hideSignIn = false }: { hideSignIn?: boolean } = {}) {
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
    { icon: FileText, title: 'Contract Vault', desc: 'Store, track, and manage every agreement in one organized vault with status tracking and renewal alerts.' },
    { icon: Building2, title: 'Rate & Clinic Manager', desc: 'Every clinic\'s details, rates, contacts, and preferences — saved and instantly searchable.' },
    { icon: CalendarDays, title: 'Shift Tracker', desc: 'See your upcoming schedule at a glance across all clinics with status-coded assignments.' },
    { icon: Receipt, title: 'Auto Invoice Workflow', desc: 'Generate, send, and track invoices with built-in payment follow-up and reminders.' },
    { icon: BarChart3, title: 'Reports & Tax Dashboard', desc: 'Track earnings, deductions, and quarterly estimated tax payments in real time.' },
    { icon: ShieldCheck, title: 'Credential Management', desc: 'Track licenses, certifications, and CE hours with expiration alerts and renewal portals.' },
  ];

  const outcomes = [
    { icon: Clock, title: 'Save hours on admin', desc: 'Stop rebuilding spreadsheets and chasing details. Everything lives in one place.' },
    { icon: Shield, title: 'Reduce missed details', desc: 'No more forgotten rates, lost contacts, or overlooked contract terms.' },
    { icon: Briefcase, title: 'Look more professional', desc: 'Send polished invoices, organized packets, and timely communications.' },
    { icon: TrendingUp, title: 'Build a scalable practice', desc: 'Create repeatable systems that grow with your relief business.' },
  ];

  const faqs = [
    { q: 'Who is Locum Ops for?', a: 'Locum Ops is built for independent locum professionals — including relief veterinarians, physician assistants, and nurse practitioners — who want a single platform to manage contracts, clinic relationships, scheduling, invoicing, and business operations.' },
    { q: 'Is the platform live now?', a: 'We\'re currently in development and onboarding early access users. Join the waitlist to be among the first to use the platform when it launches.' },
    { q: 'What happens after I join the waitlist?', a: 'You\'ll receive product updates, early access invitations, and founding-user perks. We\'ll never spam you — only meaningful updates.' },
    { q: 'Will Locum Ops include templates and workflows?', a: 'Yes. Locum Ops will include contract templates, invoice templates, clinic onboarding checklists, and repeatable workflow tools built specifically for relief practice.' },
    { q: 'Is this only for veterinarians?', a: 'No. While we started with relief veterinarians, the platform is designed to support any independent locum professional — including nurses, physicians, PAs, and allied health providers.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar scrollTo={scrollTo} hideSignIn={hideSignIn} />

      {/* ─── HERO ─── */}
      <Section className="pt-16 sm:pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="space-y-7">
              <Anim>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight text-foreground font-display">
                  Run your locum practice{' '}
                  <span className="text-primary">like a business.</span>
                </h1>
              </Anim>
              <Anim delay={0.1}>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Manage shifts, contracts, payments, credentials, and admin — finally in one calm, organized platform.
                </p>
              </Anim>
              <Anim delay={0.15}>
                <p className="text-[13px] text-muted-foreground italic leading-relaxed">
                  Built by a relief professional who understands the reality of balancing clinical work with the back-office chaos behind it.
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

          <Anim delay={0.3} className="mt-16 flex flex-wrap gap-3 justify-center">
            {trustChips.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-soft">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />{c}
              </span>
            ))}
          </Anim>
        </div>
      </Section>

      {/* ─── PROBLEM ─── */}
      <Section className="bg-secondary/50" id="problem">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em] mb-3">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display">
              Most locum professionals are running a real business<br className="hidden sm:block" /> on scattered tools.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-5">
            {painCards.map(c => (
              <motion.div key={c.title} variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-7 hover:shadow-card transition-all duration-200">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-5">
                  <c.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-[15px]">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── SOLUTION ─── */}
      <Section id="solution">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em] mb-3">The Solution</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 font-display">
              One operating system for your<br className="hidden sm:block" /> locum practice.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From first clinic contact to signed agreement to getting paid — Locum Ops keeps your work organized, professional, and on track.
            </p>
          </Anim>
          <Anim className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
              {['Inquiry', 'Agreement', 'Shift', 'Invoice', 'Payment'].map((step, i) => (
                <div key={step} className="flex items-center gap-4 sm:gap-0 sm:flex-col">
                  <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{step}</span>
                  </div>
                  {i < 4 && <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground mx-5 shrink-0" />}
                </div>
              ))}
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── FEATURES ─── */}
      <Section className="bg-secondary/50" id="features">
        <div className="max-w-6xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em] mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display">
              Everything you need to run your practice.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <motion.div key={f.title} variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-7 hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 group">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors duration-200">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-[15px]">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── BENEFITS ─── */}
      <Section id="benefits">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em] mb-3">Outcomes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display">
              Less admin. More clarity.<br className="hidden sm:block" /> More professional growth.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-5">
            {outcomes.map(o => (
              <motion.div key={o.title} variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-7 flex gap-5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-[15px]">{o.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── FOUNDER ─── */}
      <Section className="bg-secondary/50">
        <div className="max-w-3xl mx-auto">
          <Anim>
            <div className="rounded-2xl border border-border bg-card p-10 sm:p-12 text-center">
              <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em] mb-5">From the Founder</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 font-display">Built from real relief experience.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto text-[15px]">
                Locum Ops is being built by a relief professional who knows firsthand how hard it is to manage contracts, scheduling, invoicing, clinic communication, and admin — while still showing up fully for patients and clients. The platform is designed from real operational pain, not from the outside looking in.
              </p>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── SOCIAL PROOF ─── */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 font-display">
              Built for the next generation of<br className="hidden sm:block" /> independent locum professionals.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Building2, stat: 'Organize', desc: 'Every clinic in one place' },
              { icon: Zap, stat: 'Standardize', desc: 'Repeat workflows across clinics' },
              { icon: TrendingUp, stat: 'Scale', desc: 'Build a sustainable practice' },
            ].map(s => (
              <motion.div key={s.stat} variants={scaleIn}
                className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1.5 font-display">{s.stat}</p>
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
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-10 sm:p-14 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 font-display">Get early access to Locum Ops.</h2>
              <p className="text-muted-foreground mb-9 max-w-lg mx-auto text-[15px] leading-relaxed">
                Be first in line for the platform built to simplify and professionalize independent relief work.
              </p>
              <div className="max-w-md mx-auto">
                <EmailCapture source="landing_cta" />
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section className="bg-secondary/50" id="faq">
        <div className="max-w-2xl mx-auto">
          <Anim className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-display">Frequently asked questions</h2>
          </Anim>
          <Anim delay={0.1}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-6 data-[state=open]:shadow-soft">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5 text-[15px]">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-[14px]">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Anim>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img src={locumOpsLogo} alt="LocumOps" className="h-6 w-6 rounded-md" />
            <div>
              <span className="font-semibold text-foreground text-[15px]">Locum Ops</span>
              <p className="text-xs text-muted-foreground mt-0.5">Built for independent locum practice.</p>
            </div>
          </div>
          <div className="flex items-center gap-7 text-[13px] text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors duration-150">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors duration-150">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors duration-150">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Locum Ops. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
