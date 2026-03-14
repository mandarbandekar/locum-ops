import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ContinueSetupCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">Continue Setup Assistant</p>
            <p className="text-xs text-muted-foreground">Import facilities, contracts, and shifts from your existing tools</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/import')}>
          Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
