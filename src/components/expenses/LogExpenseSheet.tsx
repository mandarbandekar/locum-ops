import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, FileUp, PenLine } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManualEntry: () => void;
}

export default function LogExpenseSheet({ open, onOpenChange, onManualEntry }: Props) {
  const options = [
    {
      icon: Camera,
      label: 'Snap Receipt',
      description: "Take a photo and we'll extract the details",
      comingSoon: true,
    },
    {
      icon: FileUp,
      label: 'Upload Statement',
      description: 'Import expenses from a bank or credit card statement',
      comingSoon: true,
    },
    {
      icon: PenLine,
      label: 'Enter Manually',
      description: 'Log an expense with category, amount, and receipt',
      comingSoon: false,
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Log Expense</DrawerTitle>
          <DrawerDescription>Choose how you'd like to add an expense</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          {options.map((opt) => (
            <Card
              key={opt.label}
              className={`cursor-pointer transition-shadow hover:shadow-md ${opt.comingSoon ? 'opacity-70' : ''}`}
              onClick={() => {
                if (opt.comingSoon) {
                  toast.info('Coming soon', { description: `${opt.label} will be available in a future update.` });
                } else {
                  onOpenChange(false);
                  onManualEntry();
                }
              }}
            >
              <CardContent className="py-4 px-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <opt.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{opt.label}</p>
                    {opt.comingSoon && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
