import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Easing } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  CalendarDays, Receipt, Shield, TrendingUp, FileText,
  CheckCircle2, Menu, X, ArrowRight, Sparkles, Zap,
  Clock, AlertTriangle, Eye, Brain, Building2, Users,
  ChevronRight, ChevronDown, Mail, Linkedin, Twitter,
  Bell, Send, BookOpen, DollarSign, CircleDot, MessageSquare
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

/* ─── animation helpers ─── */
const easeOut: Easing = [0.25, 0.1, 0.25, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

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
  return <section id={id} className={`py-14 sm:py-20 md:py-28 px-4 sm:px-6 ${className}`}>{children}</section>;
}

/* ─── lead capture form ─── */
function LeadForm({ source = 'cta', defaultType = 'demo' }: { source?: string; defaultType?: 'demo' | 'beta' }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: '', currentlyWorking: '', painPoint: '' });
  const [leadType, setLeadType] = useState<'demo' | 'beta'>(defaultType);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { setErrMsg('Please enter your first name.'); return; }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErrMsg('Please enter a valid email.'); return; }
    if (!form.painPoint.trim()) { setErrMsg('Please share your biggest admin pain point.'); return; }
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
        className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 sm:px-6 sm:py-5">
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground text-base sm:text-lg">You're in!</p>
          <p className="text-sm text-muted-foreground">
            {leadType === 'demo' ? "We'll reach out to schedule your demo shortly." : "We'll send early access details soon."}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="flex gap-1.5 sm:gap-2 p-1 rounded-xl bg-muted/60 border border-border/40">
        {[
          { key: 'demo' as const, label: 'Book a Demo' },
          { key: 'beta' as const, label: 'Join Founding Beta' },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setLeadType(t.key)}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${leadType === t.key
              ? 'bg-card text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <input type="text" placeholder="First name *" value={form.firstName} onChange={e => update('firstName', e.target.value)}
          className="h-11 sm:h-12 rounded-xl border border-input bg-background px-3 sm:px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
        <input type="text" placeholder="Last name" value={form.lastName} onChange={e => update('lastName', e.target.value)}
          className="h-11 sm:h-12 rounded-xl border border-input bg-background px-3 sm:px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
      </div>

      <input type="email" placeholder="Email *" value={form.email} onChange={e => update('email', e.target.value)}
        className="w-full h-11 sm:h-12 rounded-xl border border-input bg-background px-3 sm:px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />

      <select value={form.role} onChange={e => update('role', e.target.value)}
        className="w-full h-11 sm:h-12 rounded-xl border border-input bg-background px-3 sm:px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">
        <option value="">Your role</option>
        <option value="relief_vet">Relief Veterinarian</option>
        <option value="relief_tech">Relief Vet Tech</option>
        <option value="other">Other</option>
      </select>

      <select value={form.currentlyWorking} onChange={e => update('currentlyWorking', e.target.value)}
        className="w-full h-11 sm:h-12 rounded-xl border border-input bg-background px-3 sm:px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">
        <option value="">Are you currently working as a relief vet?</option>
        <option value="yes">Yes, actively working shifts</option>
        <option value="starting">Starting soon</option>
        <option value="considering">Considering relief work</option>
        <option value="no">No</option>
      </select>

      <textarea value={form.painPoint} onChange={e => update('painPoint', e.target.value)} rows={3} maxLength={1000}
        placeholder="What is your biggest admin pain point? *"
        className="w-full rounded-xl border border-input bg-background px-3 sm:px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />

      {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}

      <button type="submit" disabled={status === 'loading'}
        className="w-full h-11 sm:h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60">
        {status === 'loading' ? 'Submitting…' : leadType === 'demo' ? 'Book a Demo' : 'Join the Founding Beta'}
      </button>

      <p className="text-xs text-muted-foreground text-center">No spam. We'll only reach out with relevant product updates.</p>
    </form>
  );
}

/* ─── product mockup ─── */
function ProductMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative w-full ${compact ? 'max-w-sm' : 'max-w-xl'} mx-auto`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border/40 bg-muted/40">
          <div className="flex gap-1.5"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-destructive/60" /><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-warning/60" /><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-success/60" /></div>
          <div className="flex-1 flex justify-center"><div className="h-5 w-32 sm:w-40 rounded-md bg-muted text-[9px] sm:text-[10px] flex items-center justify-center text-foreground/60">app.locumops.com</div></div>
        </div>
        <div className={`${compact ? 'p-3' : 'p-3 sm:p-4'} space-y-2.5 sm:space-y-3`}>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { label: 'This Month', value: '$8,450', icon: TrendingUp, color: 'text-primary' },
              { label: 'Shifts', value: '6', icon: CalendarDays, color: 'text-primary' },
              { label: 'Invoices', value: '3', icon: Receipt, color: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="rounded-lg sm:rounded-xl border border-border/40 bg-background p-2 sm:p-3">
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                  <s.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${s.color}`} />
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground truncate">{s.label}</span>
                </div>
                <p className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-bold text-foreground leading-tight`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Upcoming shifts */}
          {!compact && (
            <div className="rounded-xl border border-border/40 bg-background p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-[11px] font-semibold text-foreground mb-1.5 sm:mb-2">Upcoming Shifts</p>
              {[
                { clinic: 'Valley Animal Hospital', date: 'Mon, Mar 16', rate: '$950/day', status: 'Confirmed' },
                { clinic: 'Coastal Vet Partners', date: 'Wed, Mar 18', rate: '$1,100/day', status: 'Confirmed' },
                { clinic: 'Sunrise Pet Clinic', date: 'Fri, Mar 20', rate: '$900/day', status: 'Pending' },
              ].map(s => (
                <div key={s.clinic} className="flex items-center justify-between py-1 sm:py-1.5 border-b border-border/20 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-medium text-foreground truncate">{s.clinic}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.date} · {s.rate}</p>
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ml-2 ${s.status === 'Confirmed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
          {/* Credential alert */}
          {!compact && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-2.5 sm:p-3 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-foreground">DEA License expires in 28 days</p>
                <p className="text-[9px] sm:text-[10px] text-foreground/60">Renewal reminder sent</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      {/* Floating badges */}
      <div className={compact ? 'hidden sm:block' : ''}>
        {[
          { text: 'Credential Valid', icon: Shield, pos: '-top-3 -left-2 sm:-left-8', delay: 0.6 },
          { text: 'Invoice Created', icon: Receipt, pos: 'top-12 sm:top-16 -right-2 sm:-right-6', delay: 0.8 },
          { text: 'Reminder Sent', icon: Bell, pos: 'bottom-20 sm:bottom-24 -left-2 sm:-left-6', delay: 1.0 },
          { text: 'Revenue Tracked', icon: TrendingUp, pos: '-bottom-2 right-2 sm:right-4', delay: 1.2 },
        ].map(b => (
          <motion.div key={b.text} initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: b.delay }}
            className={`absolute ${b.pos} flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-border/60 bg-card px-2 sm:px-3 py-1.5 sm:py-2 shadow-lg shadow-primary/5 z-10`}>
            <b.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            <span className="text-[9px] sm:text-[11px] font-semibold text-foreground whitespace-nowrap">{b.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── workflow mini viz ─── */
function WorkflowViz() {
  const steps = ['Shift Scheduled', 'Confirmed', 'Completed', 'Invoice Created', 'Reminder Sent'];
  return (
    <>
      <div className="hidden sm:flex flex-wrap items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary-foreground/80">
              <CheckCircle2 className="h-3.5 w-3.5" />{s}
            </span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
      <div className="flex sm:hidden flex-col items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary-foreground/80">
              <CheckCircle2 className="h-3 w-3" />{s}
            </span>
            {i < steps.length - 1 && <ChevronDown className="h-4 w-4 text-muted-foreground my-0.5" />}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── navbar ─── */
function Navbar({ scrollTo, hideSignIn = false }: { scrollTo: (id: string) => void; hideSignIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Features', id: 'features' },
    { label: 'Who It\'s For', id: 'ideal-user' },
    { label: 'FAQ', id: 'faq' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
        <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-display">Locum Ops</span>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {!hideSignIn && <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>}
          <button onClick={() => scrollTo('early-access')}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.98]">
            Book a Demo
          </button>
        </div>
        <div className="flex md:hidden items-center gap-2">
          <button onClick={() => scrollTo('early-access')}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all active:scale-[0.98]">
            Demo
          </button>
          <button className="p-2 -mr-2" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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

/* ─── section heading helper ─── */
function SectionHeader({ tag, title, subtitle, className = '' }: { tag?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={`text-center mb-8 sm:mb-14 ${className}`}>
      {tag && <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">{tag}</p>}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-display">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-base sm:text-lg mt-3 sm:mt-4 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════ PAGE ═══════════════════════════════════ */
export default function LandingPage({ hideSignIn = false }: { hideSignIn?: boolean } = {}) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar scrollTo={scrollTo} hideSignIn={hideSignIn} />

      {/* ═══ 1. HERO ═══ */}
      <Section className="pt-10 sm:pt-14 md:pt-24 pb-8 sm:pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6">
              <Anim>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Built for Relief Vets · Workflow-First
                </span>
              </Anim>
              <Anim delay={0.05}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] sm:leading-[1.08] tracking-tight text-foreground font-display">
                  Run your relief vet business{' '}
                  <span className="text-primary">without the back-office chaos.</span>
                </h1>
              </Anim>
              <Anim delay={0.1}>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Manage shifts, automate invoice workflows, get reminders, track credentials and CE, confirm clinic schedules, and monitor revenue — all in one workflow-first platform for independent relief veterinarians.
                </p>
              </Anim>
              <Anim delay={0.15}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => scrollTo('early-access')}
                    className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                    Book a Demo
                  </button>
                  <button onClick={() => scrollTo('early-access')}
                    className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl border-2 border-border bg-card text-foreground font-semibold text-sm sm:text-base hover:bg-muted/50 transition-all active:scale-[0.98]">
                    Join the Founding Beta
                  </button>
                </div>
              </Anim>
              <Anim delay={0.2}>
                <p className="text-xs sm:text-sm text-muted-foreground/80 italic">
                  Built for relief vets tired of juggling spreadsheets, inboxes, notes, and manual follow-up.
                </p>
              </Anim>
            </div>

            <Anim delay={0.15} className="hidden lg:block">
              <ProductMockup />
            </Anim>
          </div>

          <Anim delay={0.15} className="mt-8 lg:hidden">
            <ProductMockup compact />
          </Anim>

          <Anim delay={0.3} className="mt-10 sm:mt-16">
            <WorkflowViz />
          </Anim>
        </div>
      </Section>

      {/* ═══ 2. TRUST / FOUNDER ═══ */}
      <Section className="bg-muted/30" id="founder">
        <div className="max-w-3xl mx-auto">
          <Anim>
            <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-8 md:p-10">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 sm:mb-4">From the Founder</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-5 font-display">
                Built with real relief work in mind.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 sm:mb-8">
                Locum Ops is being built alongside a real relief veterinary business to simplify the operational side of relief work — from shifts and invoices to reminders, credentials, and revenue visibility.
              </p>

              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/30">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm sm:text-base">Built alongside a real relief veterinary business</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Designed from the trenches of actual relief practice.</p>
                </div>
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 3. PROBLEM ═══ */}
      <Section id="problem">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="The Problem"
              title="Relief work gives you flexibility. The admin side takes it back."
              subtitle="As an independent relief vet, you are not just picking up shifts — you are also running a business behind the scenes." />
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              { icon: AlertTriangle, title: 'Too many disconnected tools', desc: 'Shifts, invoices, credentials, and revenue live across too many places.' },
              { icon: Clock, title: 'Manual follow-up gets missed', desc: 'Draft invoices, overdue invoices, and clinic communication are easy to lose track of.' },
              { icon: Brain, title: 'Deadlines create mental load', desc: 'Credentials, CE, and recurring admin tasks are hard to stay on top of manually.' },
              { icon: Eye, title: 'Revenue feels unclear', desc: 'It is difficult to get a clean view of how your business is actually performing.' },
            ].map(c => (
              <motion.div key={c.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 hover:shadow-lg hover:shadow-primary/5 transition-shadow">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-3 sm:mb-4">
                  <c.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 sm:mb-2 text-sm sm:text-[15px]">{c.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <Anim delay={0.3} className="text-center mt-8 sm:mt-10">
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Locum Ops brings these workflows together into one organized operating system for your relief business.
            </p>
          </Anim>
        </div>
      </Section>

      {/* ═══ 4. SOLUTION / FEATURES ═══ */}
      <Section className="bg-muted/30" id="features">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="The Platform"
              title="One operating system for the business side of relief work."
              subtitle="Locum Ops helps independent relief veterinarians replace fragmented admin work with one connected workflow." />
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: CalendarDays, title: 'Shift Management', desc: 'Keep your schedule organized and connected to the rest of your workflow.', accent: 'bg-primary/10' },
              { icon: Zap, title: 'Invoice Automation', desc: 'When a shift is completed, Locum Ops automatically creates the invoice workflow.', accent: 'bg-warning/10' },
              { icon: Bell, title: 'Reminders + Follow-Up', desc: 'Get email and SMS reminders for invoice review, draft invoices, overdue invoices, and expiring credentials.', accent: 'bg-info/10', badge: 'SMS Beta' },
              { icon: Shield, title: 'Credential + CE Tracking', desc: 'Keep important documents, requirements, and deadlines visible in one place.', accent: 'bg-success/10' },
              { icon: Send, title: 'Clinic Confirmations', desc: 'Automatically send confirmation emails for scheduled shifts.', accent: 'bg-accent', badge: 'Beta' },
              { icon: TrendingUp, title: 'Revenue Visibility', desc: 'Track income and get a clearer view of how your business is performing.', accent: 'bg-primary/10' },
            ].map(f => (
              <motion.div key={f.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 group relative">
                {f.badge && (
                  <Badge variant="info" className="absolute top-3 right-3 text-[10px]">{f.badge}</Badge>
                )}
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${f.accent} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-105 transition-transform`}>
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-base sm:text-lg mb-1.5 sm:mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ 5. HOW IT WORKS ═══ */}
      <Section id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="How It Works" title="How Locum Ops works" />
          </Anim>
          <Anim>
            {/* Desktop: timeline */}
            <div className="hidden lg:block relative">
              {/* Connector line */}
              <div className="absolute top-10 left-[8.33%] right-[8.33%] h-0.5 bg-border" />
              <div className="grid grid-cols-6 gap-4">
                {[
                  { step: '1', title: 'Add your shifts', desc: 'Keep upcoming work organized in one place.', icon: CalendarDays },
                  { step: '2', title: 'Confirm clinic schedules', desc: 'Send organized confirmations for scheduled shifts.', icon: Send },
                  { step: '3', title: 'Mark a shift complete', desc: 'This triggers the next step in your workflow.', icon: CheckCircle2 },
                  { step: '4', title: 'Review the invoice', desc: 'Locum Ops prepares the invoice workflow for you.', icon: Receipt },
                  { step: '5', title: 'Get reminders', desc: 'Stay on top of invoices that are ready, in draft, or overdue.', icon: Bell },
                  { step: '6', title: 'Track your business', desc: 'Monitor revenue, credentials, CE, and key admin deadlines.', icon: TrendingUp },
                ].map((s, i) => (
                  <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="relative text-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute -top-2 right-1/2 translate-x-[calc(50%+20px)] h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center z-20">
                      {s.step}
                    </div>
                    <h3 className="font-bold text-foreground mb-1 text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile: 2-col grid */}
            <div className="grid grid-cols-2 lg:hidden gap-3 sm:gap-4">
              {[
                { step: '1', title: 'Add your shifts', desc: 'Keep upcoming work organized in one place.', icon: CalendarDays },
                { step: '2', title: 'Confirm clinic schedules', desc: 'Send organized confirmations for scheduled shifts.', icon: Send },
                { step: '3', title: 'Mark a shift complete', desc: 'This triggers the next step in your workflow.', icon: CheckCircle2 },
                { step: '4', title: 'Review the invoice', desc: 'Locum Ops prepares the invoice workflow for you.', icon: Receipt },
                { step: '5', title: 'Get reminders', desc: 'Stay on top of invoices that are ready, in draft, or overdue.', icon: Bell },
                { step: '6', title: 'Track your business', desc: 'Monitor revenue, credentials, CE, and key admin deadlines.', icon: TrendingUp },
              ].map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="relative rounded-2xl border border-border/40 bg-card p-4 sm:p-5 text-center">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-1.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-foreground mb-1 text-xs sm:text-sm">{s.title}</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 6. AUTOMATION ═══ */}
      <Section className="bg-muted/30" id="automation">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="Automation"
              title="Automation that keeps your business moving."
              subtitle="Locum Ops reduces the mental load of running a relief business by automating the follow-up work that is easy to forget — from invoice reminders and clinic confirmations to credential expiration alerts." />
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              { icon: Receipt, title: 'Invoice ready reminders', desc: 'Know when an invoice is ready for review.', preview: '📩 Invoice #1042 is ready for review' },
              { icon: AlertTriangle, title: 'Draft + overdue reminders', desc: 'Stay on top of invoices that still need action.', preview: '⚠️ Invoice #1038 is 5 days overdue' },
              { icon: Send, title: 'Clinic confirmation emails', desc: 'Keep clinic communication organized and reliable.', preview: '✅ Shift confirmed: Valley Animal, Mar 16' },
              { icon: Shield, title: 'Credential expiration alerts', desc: 'Get ahead of important deadlines before they become urgent.', preview: '🔔 DEA License expires in 28 days' },
            ].map(c => (
              <motion.div key={c.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5 text-sm sm:text-base">{c.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">{c.desc}</p>
                {/* Mini email preview */}
                <div className="rounded-lg border border-border/30 bg-muted/30 px-3 py-2.5 text-[11px] sm:text-xs text-muted-foreground font-mono">
                  {c.preview}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ 7. BEFORE / AFTER ═══ */}
      <Section id="before-after">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="The Difference" title="From scattered admin to operational clarity." />
          </Anim>
          <Anim>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl border border-destructive/20 bg-card p-5 sm:p-7">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                  </div>
                  <h3 className="font-bold text-foreground text-base sm:text-lg">Before Locum Ops</h3>
                </div>
                <ul className="space-y-2.5 sm:space-y-3">
                  {['Spreadsheets and notes', 'Manual invoice creation', 'Forgotten follow-ups', 'Scattered credentials', 'Unclear revenue visibility', 'Mental overload'].map(item => (
                    <li key={item} className="flex items-start gap-2.5 sm:gap-3">
                      <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-card p-5 sm:p-7">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base sm:text-lg">After Locum Ops</h3>
                </div>
                <ul className="space-y-2.5 sm:space-y-3">
                  {['One connected workflow', 'Auto-generated invoices', 'Built-in reminders', 'Centralized credential and CE tracking', 'Cleaner revenue visibility', 'More control with less stress'].map(item => (
                    <li key={item} className="flex items-start gap-2.5 sm:gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 8. BENEFITS ═══ */}
      <Section className="bg-muted/30" id="benefits">
        <div className="max-w-5xl mx-auto">
          <Anim>
            <SectionHeader tag="Outcomes" title="Less mental load. More operational control." />
          </Anim>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { icon: Zap, title: 'Fewer manual steps', desc: 'Reduce repetitive admin work.' },
              { icon: FileText, title: 'Better organization', desc: 'Keep essential workflows in one place.' },
              { icon: Eye, title: 'Clearer visibility', desc: 'See revenue, deadlines, and task status more easily.' },
              { icon: Brain, title: 'Less stress', desc: 'Stay ahead of work that is easy to miss when everything is manual.' },
            ].map(o => (
              <motion.div key={o.title} variants={fadeUp}
                className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 flex gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">{o.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══ 9. IDEAL USER ═══ */}
      <Section id="ideal-user">
        <div className="max-w-3xl mx-auto text-center">
          <Anim>
            <SectionHeader tag="Who It's For"
              title="Built for independent relief veterinarians."
              subtitle="Especially those who are already actively working shifts and want a better system for managing the business side of relief work." />
          </Anim>
          <Anim delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left max-w-2xl mx-auto">
              {[
                'Work across multiple clinics',
                'Manage their own invoicing and admin',
                'Want reminders and workflow automation',
                'Need to stay ahead of credentials and CE',
                'Want better visibility into business revenue',
                'Are tired of relying on disconnected tools',
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border/40">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium text-sm sm:text-base">{item}</span>
                </div>
              ))}
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 10. TAX + COMPLIANCE ═══ */}
      <Section className="bg-muted/30" id="tax-compliance">
        <div className="max-w-4xl mx-auto">
          <Anim>
            <SectionHeader tag="Deadlines & Planning"
              title="Stay ahead of deadlines, not behind them." />
          </Anim>
          <Anim delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5 sm:mb-6">
                  Locum Ops helps you stay on top of expiring credentials, CE tracking, and estimated quarterly tax visibility based on income trends — so the business side of relief work feels less reactive.
                </p>
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Planning visibility only.</span> Quarterly tax estimates are provided for planning purposes and do not replace professional tax advice.
                  </p>
                </div>
              </div>
              {/* Summary card mockup */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 space-y-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Compliance Snapshot</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-warning" />
                      <span className="text-sm text-foreground">DEA License</span>
                    </div>
                    <Badge variant="warning" className="text-[10px]">Expires in 28 days</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">CE Progress</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">18 / 30 hrs</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      <span className="text-sm text-foreground">Q1 Estimated Set-Aside</span>
                    </div>
                    <span className="text-sm font-semibold text-success">$4,200</span>
                  </div>
                </div>
                <Badge variant="info" className="text-[10px]">Coming Soon</Badge>
              </div>
            </div>
          </Anim>
        </div>
      </Section>

      {/* ═══ 11. EARLY ACCESS / CTA ═══ */}
      <Section id="early-access">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start">
            <Anim>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">Early Access</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-5 font-display">
                Help shape the future of Locum Ops.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
                We are working closely with a small group of early users to build a better workflow system for independent relief veterinarians.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 sm:mb-8">
                If you are actively doing relief work and want a more organized way to manage shifts, invoices, reminders, credentials, and revenue, we would love to hear from you.
              </p>

            </Anim>
            <Anim delay={0.15}>
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.03] to-primary/[0.08] p-5 sm:p-6 md:p-8">
                <LeadForm source="early_access_section" defaultType="demo" />
              </div>
            </Anim>
          </div>
        </div>
      </Section>

      {/* ═══ 12. FAQ ═══ */}
      <Section className="bg-muted/30" id="faq">
        <div className="max-w-2xl mx-auto">
          <Anim>
            <SectionHeader title="Frequently asked questions" />
          </Anim>
          <Anim delay={0.1}>
            <Accordion type="single" collapsible className="space-y-2.5 sm:space-y-3">
              {[
                { q: 'What does Locum Ops do?', a: 'Locum Ops helps independent relief veterinarians manage shifts, invoice workflows, reminders, credentials, CE tracking, and revenue visibility in one place.' },
                { q: 'Does Locum Ops process payments?', a: 'Not at this stage. Locum Ops focuses on workflow automation, invoice creation, reminders, and business visibility.' },
                { q: 'Can it send invoice reminders?', a: 'Yes. Locum Ops can send email and SMS reminders for invoice review, draft invoices, and overdue invoices.' },
                { q: 'Can it help confirm scheduled shifts with clinics?', a: 'Yes. Locum Ops supports automated email workflows for confirming scheduled shifts in a more organized way.' },
                { q: 'Can it help track credentials and CE?', a: 'Yes. Locum Ops helps track credentials, CE, and upcoming expirations.' },
                { q: 'Does it estimate quarterly taxes?', a: 'Locum Ops provides estimated quarterly tax planning visibility based on income generated. It is intended as a planning aid and does not replace professional tax advice.' },
                { q: 'Who is it built for?', a: 'Locum Ops is currently focused on independent relief veterinarians managing their own business operations.' },
                { q: 'Why use this instead of spreadsheets?', a: 'Spreadsheets can track pieces of the workflow, but they do not create a connected operating system. Locum Ops is designed to reduce manual steps, missed follow-ups, and scattered admin work.' },
              ].map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/40 bg-card px-4 sm:px-5 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-3.5 sm:py-4 text-sm sm:text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-3.5 sm:pb-4 text-sm">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Anim>
        </div>
      </Section>

      {/* ═══ 13. FOOTER ═══ */}
      <footer className="border-t border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div>
              <span className="text-lg sm:text-xl font-bold text-foreground font-display">Locum Ops</span>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                A workflow-first operating system for independent relief veterinarians. Manage shifts, automate invoice workflows, stay ahead of credentials and CE, and get clearer visibility into your business revenue.
              </p>
              <button onClick={() => scrollTo('early-access')}
                className="mt-4 h-9 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                Book a Demo
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Product</p>
              <div className="space-y-2">
                {[
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Features', id: 'features' },
                  { label: 'Who It\'s For', id: 'ideal-user' },
                  { label: 'FAQ', id: 'faq' },
                ].map(l => (
                  <button key={l.id} onClick={() => scrollTo(l.id)}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
                ))}
                <button onClick={() => scrollTo('early-access')}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Join the Founding Beta</button>
              </div>
            </div>
          </div>
          <div className="mt-8 sm:mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Locum Ops. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
