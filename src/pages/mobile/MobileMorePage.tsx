import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Receipt, Car, Settings, HelpCircle, ChevronRight, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const items = [
  { to: '/credentials', label: 'Credentials', icon: ShieldCheck, desc: 'Licenses, DEA, CE' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, desc: 'Track deductions' },
  { to: '/expenses?tab=mileage', label: 'Mileage', icon: Car, desc: 'Trip log' },
  { to: '/business', label: 'Business insights', icon: BarChart3, desc: 'Revenue & clinics' },
  { to: '/settings/profile', label: 'Settings', icon: Settings, desc: 'Profile, payments, security' },
];

export default function MobileMorePage() {
  const { signOut } = useAuth();
  return (
    <div className="space-y-2">
      {items.map(({ to, label, icon: Icon, desc }) => (
        <Link key={to} to={to}>
          <Card className="p-4 active:bg-accent flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      ))}

      <a href="mailto:support@locum-ops.com">
        <Card className="p-4 active:bg-accent flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <HelpCircle className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Help & support</p>
            <p className="text-xs text-muted-foreground">Email the team</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </a>

      <Button variant="outline" className="w-full h-11 mt-4" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}
