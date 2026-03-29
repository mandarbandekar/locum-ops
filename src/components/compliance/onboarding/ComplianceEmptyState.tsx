import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Plus, Upload, GraduationCap } from 'lucide-react';

interface Props {
  onAddCredential: () => void;
  onUploadDocument: () => void;
  onAddCE: () => void;
  onStartOnboarding: () => void;
}

export function ComplianceEmptyState({ onAddCredential, onUploadDocument, onAddCE, onStartOnboarding }: Props) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Get your credentials organized</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Start by adding your first license, registration, or document. You can build the rest over time.
            </p>
          </div>
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={onAddCredential}>
              <Plus className="h-4 w-4" /> Add credential
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={onUploadDocument}>
                <Upload className="h-3.5 w-3.5" /> Upload document
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={onAddCE}>
                <GraduationCap className="h-3.5 w-3.5" /> Import CE record
              </Button>
            </div>
          </div>
          <Button variant="ghost" className="text-xs text-muted-foreground" onClick={onStartOnboarding}>
            Start guided setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
