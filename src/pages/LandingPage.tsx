import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight, Calendar, FileCheck, FileText, Shield, Clock, Users, Building2,
  Briefcase, Stethoscope, UserCheck, BarChart3, Workflow, CheckCircle2,
  AlertTriangle, ChevronRight, Menu, X, Zap, TrendingUp, FolderOpen,
  ClipboardCheck, DollarSign, Settings2, BookOpen, FileSearch, CircleDollarSign,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useState, useRef } from 'react';
import locumOpsLogo from '@/assets/locumops-logo.png';

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
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

/* ─── Product mockup component ─── */
function ProductMockup() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-3xl blur-2xl" />
      <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-muted/30">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          <span className="ml-3 text-[10px] text-muted-foreground font-medium">Locum Ops — Dashboard</span>
        </div>
        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Top row stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Upcoming Shifts', value: '12', color: 'text-primary' },
              { label: 'Pending Invoices', value: '$8,420', color: 'text-warning' },
              { label: 'Active Contracts', value: '6', color: 'text-success' },
            ].map(s => (
              <div key={s.label} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Calendar preview */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-foreground">March 2026</span>
              <span className="text-[9px] text-muted-foreground">Week View</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                <div key={d}>
                  <p className="text-[8px] text-muted-foreground text-center mb-1">{d}</p>
                  <div className={`h-8 rounded ${i === 0 || i === 3 ? 'bg-primary/20 border border-primary/30' : i === 2 ? 'bg-orange-500/15 border border-orange-500/25' : 'bg-muted/50'}`} />
                </div>
              ))}
            </div>
          </div>
          {/* Credential status */}
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            <span className="text-[10px] text-foreground font-medium">Credentialing</span>
            <div className="flex-1" />
            <span className="text-[9px] bg-success/15 text-success px-2 py-0.5 rounded-full font-medium">8/9 Complete</span>
          </div>
        </div>
      </div>
    </div>
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

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
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
                Locum Ops helps locum professionals, clinics, and staffing groups simplify scheduling, contracts, rates, credentialing, invoicing, and everyday operations — all in one place.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-start gap-3"
              >
                <Button size="lg" onClick={() => scrollTo('platform')} className="shadow-md px-6">
                  Explore the Platform <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('segments')} className="px-6">
                  Find Your Segment <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Right: Product Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden lg:block"
            >
              <ProductMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ 2. SEGMENT SELECTOR ═══════════ */}
      <AnimatedSection id="segments" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeader
          label="Solutions"
          title="Built for every side of locum work"
        />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        >
          {[
            { icon: UserCheck, title: 'Independent Locum Professionals', desc: 'Run your work like a business', color: 'text-primary' },
            { icon: Building2, title: 'Clinics & Practices', desc: 'Coordinate coverage with less admin', color: 'text-blue-600 dark:text-blue-400' },
            { icon: Users, title: 'Staffing & Locum Groups', desc: 'Standardize workflows across teams', color: 'text-purple-600 dark:text-purple-400' },
            { icon: Stethoscope, title: 'Relief Veterinarians', desc: 'Organize shifts, rates, contracts, and payments', color: 'text-teal-600 dark:text-teal-400' },
            { icon: Briefcase, title: 'Physician & APP Locums', desc: 'Simplify operational overhead across assignments', color: 'text-orange-600 dark:text-orange-400' },
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
            title="Designed for both independent professionals and locum organizations"
          />
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'For Independent Locums',
                desc: 'Run the business side of your clinical career with professional-grade tools built for one.',
                features: ['Manage your own schedule and availability', 'Track credentials and renewal deadlines', 'Generate invoices and follow up on payments', 'Store contracts and rate terms per facility'],
                icon: UserCheck,
                accent: 'from-primary/10 to-primary/5',
              },
              {
                title: 'For Clinics & Groups',
                desc: 'Coordinate locum coverage, standardize onboarding, and keep operations running smoothly.',
                features: ['Coordinate multi-provider scheduling', 'Standardize credentialing and compliance', 'Manage contracts and rate structures', 'Streamline invoicing and payment workflows'],
                icon: Building2,
                accent: 'from-blue-500/10 to-blue-500/5',
              },
            ].map((side) => (
              <div key={side.title} className={`bg-gradient-to-br ${side.accent} border border-border/60 rounded-xl p-8`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-card shadow-sm flex items-center justify-center">
                    <side.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">{side.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{side.desc}</p>
                <ul className="space-y-2.5">
                  {side.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>

      {/* ═══════════ 8. MISSION ═══════════ */}
      <AnimatedSection id="mission" className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <SectionHeader
          label="Our Mission"
          title="Locum work has evolved. The systems behind it haven't."
          subtitle="Flexible clinical work is the fastest-growing segment in healthcare staffing. But the operational tools behind it haven't kept pace. Locum Ops is purpose-built to modernize the workflows behind flexible clinical work — for professionals, clinics, and staffing groups alike."
        />
        <Button size="lg" variant="outline" onClick={() => navigate('/waitlist')} className="px-6">
          Join the Movement <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AnimatedSection>

      {/* ═══════════ 9. RESOURCES ═══════════ */}
      <div className="bg-muted/30">
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
