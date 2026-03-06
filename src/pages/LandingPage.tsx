import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight, ChevronDown, Check, AlertTriangle,
  Building2, CalendarDays, Mail, FileText, Users, HelpCircle, Menu, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const sectionFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── FAQ data ─── */
const faqs = [
  { q: 'Is this a marketplace to find shifts?', a: 'No. LocumOps is your back office—built to manage the facilities you already work with.' },
  { q: 'Do you send real emails?', a: 'In MVP, you can send from templates and log what you sent. Real email sending can be added once you choose a provider (Gmail/Outlook) in v1.5/v2.' },
  { q: 'Do you replace QuickBooks?', a: 'Not in v1. LocumOps focuses on scheduling + invoicing + AR. Accounting integrations can come later.' },
  { q: 'What about credentials/licenses and CE?', a: 'Planned for v2 as a profession-agnostic "Credentials" module.' },
  { q: 'Can I import from Excel?', a: 'Planned shortly after MVP (CSV import for facilities/shifts).' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useAuth();

  const handleDemo = () => { enterDemo(); navigate('/'); };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* ── NAV ── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="border-b bg-card/80 backdrop-blur sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <span className="font-bold text-lg text-foreground tracking-tight">LocumOps</span>
          <nav className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('how')} className="hover:text-foreground transition-colors">How it works</button>
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/login')}>Sign In</Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleDemo}>Try Demo</Button>
            <Button size="sm" onClick={() => { console.log('cta_click', { location: 'nav' }); navigate('/waitlist'); }}>
              Join waitlist
            </Button>
            {/* Mobile menu */}
            <MobileMenu onNavigate={navigate} onScrollTo={scrollTo} onDemo={handleDemo} />
          </div>
        </div>
      </motion.header>

      {/* ── 1. HERO ── */}
      <section className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-5">
          Run your independent clinician business without spreadsheets.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          LocumOps is the back-office OS for solo clinicians (vets, nurses, physicians, pharmacists, PT/OT): facility CRM, shift confirmations, invoicing, and payment tracking—in one place.
        </motion.p>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Button size="lg" onClick={() => { console.log('cta_click', { location: 'hero_primary' }); navigate('/waitlist'); }}>
            Join the waitlist <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo('how')}>
            See how it works <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-xs text-muted-foreground">
          No marketplace. No agency. Just your operations—simplified.
        </motion.p>
      </section>

      {/* ── 2. PROBLEM → AGITATION ── */}
      <motion.section variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
        className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">You're doing a full business in Google Sheets.</h2>
        <ul className="space-y-3 mb-6">
          {[
            'Facility contacts + rates buried in tabs',
            'Monthly "confirm my dates" emails done by hand',
            'Invoices sent late → payments delayed',
            'Follow-ups are easy to miss',
            'Double bookings happen when life gets busy',
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="text-lg font-semibold text-foreground">Spreadsheets don't remind you. <span className="text-primary">LocumOps does.</span></p>
      </motion.section>

      {/* ── 3. VALUE PROPS ── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Building2, title: 'Facility CRM that actually helps', body: 'Save contacts, rate terms, cancellation/OT/late fee policies—per facility, searchable.' },
            { icon: CalendarDays, title: 'Monthly scheduling that runs itself', body: 'Open next month\'s availability + send facility confirmations with booked dates in a click.' },
            { icon: FileText, title: 'Invoicing + payment tracking', body: 'Create invoices from completed shifts, mark sent/paid with timestamps, and see what\'s overdue instantly.' },
          ].map((c, i) => (
            <motion.div key={c.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
              <Card className="border bg-card h-full hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <c.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ── */}
      <motion.section id="how" variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">How it works</h2>
        <ol className="space-y-6 mb-8">
          {[
            'Add facilities (contacts + terms snapshot)',
            'Add shifts (calendar + conflict warning)',
            'Send confirmations (booked dates auto-listed per facility)',
            'Invoice & get paid (status tracking + reminders)',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</span>
              <span className="text-foreground pt-1">{step}</span>
            </li>
          ))}
        </ol>
        <Button onClick={() => { console.log('cta_click', { location: 'how_section' }); navigate('/waitlist'); }}>
          Join the waitlist <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.section>

      {/* ── 5. FEATURES ── */}
      <motion.section id="features" variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
        className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">Features</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          {([
            { title: 'Facilities (CRM)', icon: Building2, bullets: ['Facility profile with scheduler + billing contacts', 'Terms Snapshot (weekday/weekend rate, cancellation, OT, late fees)', 'Notes + last outreach sent'] },
            { title: 'Schedule', icon: CalendarDays, bullets: ['Calendar + list view', 'Shift statuses: Proposed / Booked / Completed / Canceled', 'Overlap warning for booked shifts'] },
            { title: 'Outreach + Confirmations', icon: Mail, bullets: ['Open scheduling for next month email flow', 'Monthly confirmations per facility with auto-generated booked dates', 'Email logs (sent history)'] },
            { title: 'Invoices + AR', icon: FileText, bullets: ['Create invoice by facility + date range', 'Line items from completed shifts', 'Draft → Sent → Paid (with timestamps)', 'Overdue visibility + optional reminder nudges (v1.5)'] },
          ] as const).map((s, i) => (
            <div key={s.title} className="space-y-3">
              <div className="flex items-center gap-2">
                <s.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">{s.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── 6. OUTCOMES ── */}
      <motion.section variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
        className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">What users can expect</h2>
        <ul className="space-y-3">
          {[
            'Faster invoice sending (same day instead of "later this week")',
            'Fewer missed confirmations',
            'Clearer "who owes me what" every month',
            'Less mental load switching between calendar, email, and spreadsheets',
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* ── 7. WHO IT'S FOR ── */}
      <motion.section variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
        className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Who it's for</h2>
        <p className="text-muted-foreground mb-6">Built for independent clinicians who work across facilities:</p>
        <ul className="space-y-2 mb-4">
          {['Relief veterinarians', 'PRN / per diem nurses', 'Locum physicians', 'Contract pharmacists', 'PT/OT contractors'].map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-primary" />{b}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground italic">Not for: staffing agencies or facility VMS teams (yet).</p>
      </motion.section>

      {/* ── 8. PRICING ── */}
      <motion.section id="pricing" variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
        className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center">Pricing</h2>
        <div className="grid sm:grid-cols-3 gap-6 mb-4">
          {([
            { name: 'Solo', price: '$29/mo', tag: 'For one clinician running their own ops', features: ['Facilities CRM + terms snapshot', 'Scheduling + confirmations', 'Invoices + sent/paid tracking', 'Email templates + logs', 'Unlimited facilities & shifts'] },
            { name: 'Pro', price: '$59/mo', tag: 'For high volume or multi-state work', features: ['Everything in Solo, plus:', 'Automated overdue reminders (v1.5)', 'Custom invoice templates', 'Priority support', 'Exports (CSV/PDF)'] },
            { name: 'Assistant', price: '$89/mo', tag: 'For clinician + spouse/admin help', features: ['Everything in Pro, plus:', '2–3 user seats', 'Role permissions (admin/assistant)', 'Activity log'] },
          ] as const).map((plan, i) => (
            <Card key={plan.name} className={`border bg-card flex flex-col ${i === 1 ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="pt-6 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                <p className="text-3xl font-extrabold text-foreground mt-1 mb-1">{plan.price}</p>
                <p className="text-sm text-muted-foreground mb-5">{plan.tag}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={i === 1 ? 'default' : 'outline'}
                  onClick={() => { console.log('cta_click', { location: 'pricing', plan: plan.name }); navigate('/waitlist'); }}>
                  Join the waitlist
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">Early waitlist users get founder pricing for life.</p>
      </motion.section>

      {/* ── 9. FAQ ── */}
      <motion.section id="faq" variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </motion.section>

      {/* ── 10. FINAL CTA ── */}
      <section className="bg-muted">
        <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
          className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Stop running your business in spreadsheets.</h2>
          <p className="text-muted-foreground mb-6">Join the waitlist to get early access + founder pricing.</p>
          <Button size="lg" onClick={() => { console.log('cta_click', { location: 'final_cta' }); navigate('/waitlist'); }}>
            Join the waitlist <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">We'll invite waitlist users in small batches.</p>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex gap-4">
          <span className="hover:text-foreground cursor-pointer">Privacy</span>
          <span className="hover:text-foreground cursor-pointer">Terms</span>
        </div>
        <span>© {new Date().getFullYear()} LocumOps</span>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg bg-card">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-medium text-foreground text-sm">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

function MobileMenu({ onNavigate, onScrollTo, onDemo }: { onNavigate: (path: string) => void; onScrollTo: (id: string) => void; onDemo: () => void }) {
  const [open, setOpen] = useState(false);
  const go = (fn: () => void) => { fn(); setOpen(false); };
  return (
    <div className="sm:hidden">
      <button onClick={() => setOpen(!open)} className="p-1.5 text-muted-foreground hover:text-foreground">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="absolute top-14 left-0 right-0 bg-card border-b shadow-lg z-40 px-4 py-4 space-y-3">
          <button onClick={() => go(() => onScrollTo('how'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">How it works</button>
          <button onClick={() => go(() => onScrollTo('features'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Features</button>
          <button onClick={() => go(() => onScrollTo('pricing'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Pricing</button>
          <button onClick={() => go(() => onScrollTo('faq'))} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">FAQ</button>
          <hr className="border-border" />
          <button onClick={() => go(() => onNavigate('/login'))} className="block w-full text-left text-sm text-foreground font-medium">Sign In</button>
          <button onClick={() => go(onDemo)} className="block w-full text-left text-sm text-foreground font-medium">Try Demo</button>
        </motion.div>
      )}
    </div>
  );
}
