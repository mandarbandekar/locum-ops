import { Info, LayoutDashboard, Building2, CalendarDays, FileText, BarChart3, ShieldCheck, Settings } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const modules = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: "Your command center. See upcoming shifts, outstanding invoices, credential renewals, and tax deadlines \u2014 all in one glance. Revenue trends and anticipated earnings help you forecast cash flow.",
  },
  {
    icon: Building2,
    title: 'Practice Facilities',
    description: "Store clinic details, billing preferences, scheduling contacts, and contract checklists for every facility you work with. Each clinic\u2019s invoicing cadence (daily, weekly, monthly) drives automatic invoice generation.",
  },
  {
    icon: CalendarDays,
    title: 'Schedule',
    description: "Book and manage shifts with a visual weekly calendar. Drag-and-drop rescheduling, conflict detection, and built-in clinic confirmations ensure your schedule stays accurate and confirmed.",
  },
  {
    icon: FileText,
    title: 'Invoices',
    description: "Invoices are auto-generated based on each clinic\u2019s billing cadence. Review drafts, track payments, send reminders, and share invoices via secure links \u2014 no more spreadsheets or manual calculations.",
  },
  {
    icon: BarChart3,
    title: 'Business',
    description: "Revenue reports, estimated quarterly tax tracking, and an AI-powered Tax Planning Advisor help you stay on top of your 1099 business finances and maximize deductions.",
  },
  {
    icon: ShieldCheck,
    title: 'Credential Management',
    description: "Track licenses, certifications, CE credits, and required documents in one place. Get renewal reminders before anything expires, and build credential packets for clinic onboarding.",
  },
  {
    icon: Settings,
    title: 'Settings',
    description: "Configure your invoice profile, payment methods, calendar sync, reminder preferences, and account details to tailor LocumOps to how you run your practice.",
  },
];

export function DemoGuideDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">How It Works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold">
            Welcome to LocumOps
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Built for independent relief veterinarians to manage the back-office side of locum work &mdash; scheduling, invoicing, credentials, and taxes &mdash; all in one place.
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          <div className="space-y-4">
            {modules.map((mod) => (
              <div key={mod.title} className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-primary/10">
                  <mod.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-5 mb-1">
            This demo is preloaded with sample data so you can explore every feature.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
