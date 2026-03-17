import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Easing } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  CalendarDays, Receipt, Shield, TrendingUp, FileText,
  CheckCircle2, Menu, X, ArrowRight, Sparkles, Zap,
  Clock, AlertTriangle, Eye, Brain, Building2, Users,
  ChevronRight, Mail, Linkedin, Twitter
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

/* ─── animation helpers ─── */
const easeOut: Easing = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };

function Anim({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: easeOut } } }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── section wrapper ─── */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-20 sm:py-28 px-4 sm:px-6 ${className}`}>{children}</section>;
}

/* ─── lead capture form ─── */
function LeadForm({ source = 'cta', defaultType = 'beta' }: { source?: string; defaultType?: 'demo' | 'beta' }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: '', currentlyWorking: '', painPoint: '' });
  const [leadType, setLeadType] = useState<'demo' | 'beta'>(defaultType);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErrMsg('Please enter a valid email.'); return; }
    if (!form.firstName.trim()) { setErrMsg('Please enter your first name.'); return; }
    setErrMsg('');
    setStatus('loading');

    const { error } = await supabase.from('waitlist_leads').insert({
      email: form.email.trim(),
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      role: form.role,
      currently_working: form.currentlyWorking,
      pain_point: form.painPoint.slice(0, 1000),
      lead_type: leadType,
      source_page: source,
    });

    if (error) { setStatus('error'); setErrMsg('Something went wrong. Please try again.'); }
    else setStatus('success');
  };

  if (status === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5">
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground text-lg">You're in!</p>
          <p className="text-sm text-muted-foreground">
            {leadType === 'demo' ? "We'll reach out to schedule your demo shortly." : "We'll send early access details soon."}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lead type toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted/60 border border-border/40">
        {[
          { key: 'demo' as const, label: 'Book a Demo' },
          { key: 'beta' as const, label: 'Join the Founding Beta' },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setLeadType(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${leadType === t.key
              ? 'bg-card text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="First name *" value={form.firstName} onChange={e => update('firstName', e.target.value)}
          className="h-12 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
        <input type="text" placeholder="Last name" value={form.lastName} onChange={e => update('lastName', e.target.value)}
          className="h-12 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
      </div>

      <input type="email" placeholder="Email *" value={form.email} onChange={e => update('email', e.target.value)}
        className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />

      <select value={form.role} onChange={e => update('role', e.target.value)}
        className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">
        <option value="">Your role</option>
        <option value="relief_vet">Relief Veterinarian</option>
        <option value="relief_tech">Relief Vet Tech</option>
        <option value="clinic_owner">Clinic Owner / Manager</option>
        <option value="other">Other</option>
      </select>

      <select value={form.currentlyWorking} onChange={e => update('currentlyWorking', e.target.value)}
        className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">
        <option value="">Are you currently working as a relief vet?</option>
        <option value="yes">Yes, actively working shifts</option>
        <option value="starting">Starting soon</option>
        <option value="considering">Considering relief work</option>
        <option value="no">No</option>
      </select>

      <textarea value={form.painPoint} onChange={e => update('painPoint', e.target.value)} rows={3} maxLength={1000}
        placeholder="What is your biggest admin pain point? (optional)"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />

      {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}

      <button type="submit" disabled={status === 'loading'}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60">
        {status === 'loading' ? 'Submitting…' : leadType === 'demo' ? 'Book a Demo' : 'Join the Founding Beta'}
      </button>

      <p className="text-xs text-muted-foreground text-center">No spam. We'll only reach out with relevant product updates.</p>
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
              { label: 'This Month', value: '$8,450', icon: TrendingUp, color: 'text-primary' },
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
        { text: 'Credential Valid', icon: Shield, pos: '-top-3 -left-4 sm:-left-8', delay: 0.6 },
        { text: 'Invoice Created', icon: Receipt, pos: 'top-16 -right-3 sm:-right-6', delay: 0.8 },
        { text: 'Revenue Tracked', icon: TrendingUp, pos: 'bottom-20 -left-3 sm:-left-6', delay: 1.0 },
        { text: 'Shift Complete', icon: CalendarDays, pos: '-bottom-2 right-4', delay: 1.2 },
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

/* ─── workflow mini viz ─── */
function WorkflowViz() {
  const steps = ['Shift Scheduled', 'Shift Completed', 'Invoice Created', 'Revenue Tracked'];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-0">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />{s}
          </span>
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
        </div>
      ))}
    </div>
  );
}

/* ─── navbar ─── */
function Navbar({ scrollTo, hideSignIn = false }: { scrollTo: (id: string) => void; hideSignIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Benefits', id: 'benefits' },
    { label: 'FAQ', id: 'faq' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Locum Ops</span>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {!hideSignIn && <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>}
          <button onClick={() => scrollTo('early-access')}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.98]">
            Book a Demo
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
          {!hideSignIn && <Link to="/login" onClick={() => setOpen(false)}
            className="block w-full text-left py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>}
          <button onClick={() => { scrollTo('early-access'); setOpen(false); }}
            className="mt-2 w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Book a Demo</button>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar scrollTo={scrollTo} hideSignIn={hideSignIn} />

      {/* ═══ 1. HERO ═══ */}
      <Section className="pt-14 sm:pt-24 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <Anim>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Now accepting founding beta users
                </span>
              </Anim>
              <Anim delay={0.05}>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Run your relief vet business{' '}
                  <span className="text-primary">without the back-office chaos.</span>
                </h1>
              </Anim>
              <Anim delay={0.1}>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Manage shifts, automate invoice creation when work is completed, keep credentials organized, and track business revenue — all in one workflow-first platform.
                </p>
              </Anim>
              <Anim delay={0.15}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => scrollTo('early-access')}
                    className="h-12 px-7 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                    Book a Demo
                  </button>
                  <button onClick={() => scrollTo('early-access')}
                    className="h-12 px-7 rounded-xl border-2 border-border bg-card text-foreground font-semibold text-base hover:bg-muted/50 transition-all active:scale-[0.98]">
                    Join the Founding Beta
                  </button>
                </div>
              </Anim>
              <Anim delay={0.2}>
                <p className="text-sm text-muted-foreground/80 italic">
                  Built for independent relief veterinarians who are tired of juggling spreadsheets, notes, inboxes, and scattered tools.
                </p>
              </Anim>
            </div>
            <Anim delay={0.15} className="hidden lg:block">
              <ProductMockup />
            </Anim>
          </div>

          {/* Mini workflow viz */}
          <Anim delay={0.3} className="mt-16">
            <WorkflowViz />
          </Anim>
        </div>
      </Section>

      {/* ═══ 2. FOUNDER TRUST ═══ */}
      <Section className="bg-muted/30" id="founder">
        <div className="max-w-3xl mx-auto">
          <Anim>
            <div className="rounded-2xl border border-border/40 bg-card p-8 sm:p-10">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">From the Founder</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Built by someone who understands the chaos firsthand.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Locum Ops is being built alongside a real relief veterinary business by a founder who has seen how fragmented the back office can become. From tracking shifts and credentials to creating invoices and understanding revenue, too much of the business side still lives across disconnected tools.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Locum Ops is designed to simplify that operational burden and bring the workflow into one place.
              </p>

              {/* Founder credibility card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/30">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Founder & Relief Veterinarian</p>
                  <p className="text-sm text-muted-foreground">Building Locum Ops from the trenches of real relief practice.</p>
                </div>
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 3. PROBLEM ═══ */}
      <Section id="problem">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Relief work gives you flexibility.<br className="hidden sm:block" /> The admin side takes it back.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: AlertTriangle, title: 'Shifts, credentials, and invoices live in different places', desc: 'Your schedule is in one app, credentials in a folder, invoices in a spreadsheet — nothing is connected.' },
              { icon: Clock, title: 'Manual invoicing is repetitive and easy to delay', desc: 'Rebuilding invoices from scratch after every shift wastes time and leads to delayed billing.' },
              { icon: Eye, title: 'Revenue tracking is messy and hard to see clearly', desc: 'Without a connected view, understanding your business revenue requires stitching together multiple sources.' },
              { icon: Brain, title: 'Important admin tasks rely on memory and scattered tools', desc: 'Credential renewals, follow-ups, and operations depend on remembering instead of a reliable system.' },
            ].map(c => (
              <motion.div key={c.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-6 hover:shadow-lg hover:shadow-primary/5 transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-[15px]">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <Anim delay={0.3} className="text-center mt-10">
            <p className="text-muted-foreground text-base max-w-2xl mx-auto">
              Locum Ops brings these workflows together into one organized operating system for your relief business.
            </p>
          </Anim>
        </div>
      </Section>

      {/* ═══ 4. SOLUTION / FEATURES ═══ */}
      <Section className="bg-muted/30" id="features">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              One workflow-first platform for the<br className="hidden sm:block" /> business side of relief work.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: CalendarDays, title: 'Shift Management', desc: 'Keep your shifts organized and connected to the rest of your workflow.', accent: 'bg-primary/10' },
              { icon: Zap, title: 'Automated Invoice Workflow', desc: 'When a shift is marked complete, Locum Ops automatically creates the invoice workflow so you spend less time on repetitive admin.', accent: 'bg-warning/10' },
              { icon: Shield, title: 'Credential Management', desc: 'Track licenses, certificates, and important business documents in one place.', accent: 'bg-success/10' },
              { icon: TrendingUp, title: 'Revenue Tracking', desc: 'Get a clearer view of your business revenue without stitching together multiple tools.', accent: 'bg-info/10' },
            ].map(f => (
              <motion.div key={f.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-7 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 group">
                <div className={`h-12 w-12 rounded-xl ${f.accent} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ 5. HOW IT WORKS ═══ */}
      <Section id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              How Locum Ops works
            </h2>
          </Anim>
          <Anim>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Add your shifts', desc: 'Log shifts across all your clinics in one organized calendar.', icon: CalendarDays },
                { step: '2', title: 'Mark a shift complete', desc: 'When the work is done, update the status with a single tap.', icon: CheckCircle2 },
                { step: '3', title: 'Invoice created automatically', desc: 'The invoice workflow generates so you don\'t have to build it from scratch.', icon: Receipt },
                { step: '4', title: 'Track revenue & operations', desc: 'See your business performance and stay on top of admin tasks.', icon: TrendingUp },
              ].map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="relative rounded-2xl border border-border/40 bg-card p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute -top-3 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </Anim>
          {/* Connector arrows for desktop */}
          <Anim delay={0.3} className="hidden lg:flex justify-center mt-4 gap-0">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center" style={{ width: '25%', justifyContent: 'center' }}>
                <ArrowRight className="h-5 w-5 text-primary/40" />
              </div>
            ))}
          </Anim>
        </div>
      </Section>

      {/* ═══ 6. BEFORE / AFTER ═══ */}
      <Section className="bg-muted/30" id="before-after">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The Difference</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              From scattered admin to operational clarity.
            </h2>
          </Anim>
          <Anim>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="rounded-2xl border border-destructive/20 bg-card p-7">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Before Locum Ops</h3>
                </div>
                <ul className="space-y-3">
                  {['Spreadsheets for everything', 'Email threads for scheduling', 'Manual invoice creation every time', 'Scattered credentials across folders', 'Unclear revenue tracking', 'Mental overload from juggling tools'].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* After */}
              <div className="rounded-2xl border border-primary/20 bg-card p-7">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">After Locum Ops</h3>
                </div>
                <ul className="space-y-3">
                  {['One connected workflow', 'Automated invoice creation after completed shifts', 'Centralized credential management', 'Cleaner revenue visibility', 'Fewer dropped admin tasks', 'More control over the business side'].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 7. BENEFITS / OUTCOMES ═══ */}
      <Section id="benefits">
        <div className="max-w-5xl mx-auto">
          <Anim className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Outcomes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Less mental load. More operational control.
            </h2>
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: 'Fewer manual steps', desc: 'Automated workflows mean less time on repetitive admin tasks.' },
              { icon: FileText, title: 'More organized workflow', desc: 'Everything connected — shifts, invoices, credentials, revenue — in one system.' },
              { icon: Eye, title: 'Better business visibility', desc: 'See your operations and revenue clearly without piecing things together.' },
              { icon: Brain, title: 'Less admin stress', desc: 'Stop relying on memory and scattered tools to run your business.' },
            ].map(o => (
              <motion.div key={o.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-6 flex gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{o.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ 8. IDEAL USER ═══ */}
      <Section className="bg-muted/30" id="ideal-user">
        <div className="max-w-3xl mx-auto text-center">
          <Anim>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Who It's For</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Built for independent relief veterinarians.
            </h2>
            <p className="text-muted-foreground text-lg mb-10">Especially those who:</p>
          </Anim>
          <Anim delay={0.1}>
            <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              {[
                'Work across multiple clinics',
                'Manage their own invoicing and operations',
                'Want a better way to stay on top of credentials',
                'Need clearer visibility into business revenue',
                'Are tired of using disconnected tools',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/40">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 9. EARLY ACCESS / CTA ═══ */}
      <Section id="early-access">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <Anim>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Early Access</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Help shape the future of Locum Ops.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                We are working closely with a small group of early users to refine the platform and build the most useful workflow system for independent relief veterinarians.
              </p>

              {/* Testimonial placeholder */}
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pilot Feedback</p>
                <p className="text-muted-foreground italic leading-relaxed">
                  "We're collecting feedback from our founding beta users. Real testimonials will appear here soon."
                </p>
                <p className="text-xs text-muted-foreground mt-3">— Coming soon from founding beta users</p>
              </div>
            </Anim>
            <Anim delay={0.15}>
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.03] to-primary/[0.08] p-6 sm:p-8">
                <LeadForm source="early_access_section" defaultType="demo" />
              </div>
            </Anim>
          </div>
        </div>
      </Section>

      {/* ═══ 10. FAQ ═══ */}
      <Section className="bg-muted/30" id="faq">
        <div className="max-w-2xl mx-auto">
          <Anim className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Frequently asked questions
            </h2>
          </Anim>
          <Anim delay={0.1}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: 'What does Locum Ops do?', a: 'Locum Ops helps independent relief veterinarians manage the business side of their work, including shifts, invoice workflows, credentials, and revenue tracking.' },
                { q: 'Does Locum Ops process payments?', a: 'Not at this stage. Locum Ops currently focuses on workflow automation, including automatic invoice creation when a shift is marked completed, along with revenue and operational tracking.' },
                { q: 'Who is it built for?', a: 'Locum Ops is currently focused on independent relief veterinarians managing their own business operations.' },
                { q: 'Why use this instead of spreadsheets?', a: 'Spreadsheets can track pieces of the workflow, but they do not create a connected operating system. Locum Ops is designed to reduce manual steps and keep your back-office workflows organized in one place.' },
                { q: 'Is this only for veterinarians?', a: 'The current product and landing page are focused on independent relief veterinarians. Over time, the broader workflow may expand to other locum professionals.' },
              ].map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/40 bg-card px-5 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-4">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Anim>
        </div>
      </Section>

      {/* ═══ 11. FOOTER ═══ */}
      <footer className="border-t border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8 items-start">
            <div>
              <span className="text-xl font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Locum Ops</span>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                The workflow-first back-office platform for independent relief veterinarians. Manage shifts, automate invoices, track credentials, and see your revenue — all in one place.
              </p>
              <button onClick={() => scrollTo('early-access')}
                className="mt-4 h-9 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                Book a Demo
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Product</p>
              <div className="space-y-2">
                {['Features', 'How It Works', 'Benefits', 'FAQ'].map(l => (
                  <button key={l} onClick={() => scrollTo(l.toLowerCase().replace(/ /g, '-'))}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Connect</p>
              <div className="space-y-2">
                <a href="mailto:hello@locumops.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-4 w-4" /> hello@locumops.com
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-4 w-4" /> Twitter
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Locum Ops. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
