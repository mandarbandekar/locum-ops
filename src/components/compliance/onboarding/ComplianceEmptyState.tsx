import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Plus, Upload, GraduationCap, Clock, FileText, Bell, CheckCircle2 } from 'lucide-react';

interface Props {
  onAddCredential: () => void;
  onUploadDocument: () => void;
  onAddCE: () => void;
  onStartOnboarding: () => void;
}

const VALUE_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Centralized credential tracking',
    description: 'Keep all your licenses, DEA registrations, and certifications organized in one secure place.',
  },
  {
    icon: Clock,
    title: 'Never miss a renewal deadline',
    description: 'Get proactive alerts before credentials expire so you stay compliant without the stress.',
  },
  {
    icon: FileText,
    title: 'Document vault',
    description: 'Upload and organize license copies, insurance certificates, and CE records for quick access.',
  },
  {
    icon: Bell,
    title: 'Smart renewal readiness',
    description: 'See exactly what\'s needed for each renewal — CE hours, documents, and deadlines — at a glance.',
  },
];

export function ComplianceEmptyState({ onAddCredential, onUploadDocument, onAddCE, onStartOnboarding }: Props) {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Hero intro */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Your Compliance Center</h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Everything you need to stay on top of your professional credentials, continuing education, 
            and renewal deadlines — all in one place.
          </p>
        </div>
      </div>

      {/* Value proposition cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VALUE_POINTS.map((point) => (
          <Card key={point.title} className="border-border/50">
            <CardContent className="p-5 flex gap-4">
              <div className="p-2.5 rounded-lg bg-primary/10 h-fit shrink-0">
                <point.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">{point.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Ready to get started?</h3>
            <p className="text-sm text-muted-foreground">
              Set up takes just a few minutes. Add what you have now and fill in the rest later.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={onStartOnboarding}>
              <CheckCircle2 className="h-4 w-4" /> Start guided setup
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={onAddCredential}>
              <Plus className="h-3.5 w-3.5" /> Add credential manually
            </Button>
            <span className="text-muted-foreground/30">·</span>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={onUploadDocument}>
              <Upload className="h-3.5 w-3.5" /> Upload document
            </Button>
            <span className="text-muted-foreground/30">·</span>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={onAddCE}>
              <GraduationCap className="h-3.5 w-3.5" /> Import CE record
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
