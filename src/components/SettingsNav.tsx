import { NavLink } from '@/components/NavLink';
import { User, CalendarDays, FileText, CreditCard, Bell, Briefcase, Shield, Settings } from 'lucide-react';

const settingsLinks = [
  { to: '/settings/profile', label: 'Profile', icon: User },
  { to: '/settings/scheduling', label: 'Scheduling', icon: CalendarDays },
  { to: '/settings/payments', label: 'Payments', icon: CreditCard },
  { to: '/settings/reminders', label: 'Reminders', icon: Bell },
  { to: '/settings/business-taxes', label: 'Business & Taxes', icon: Briefcase },
  { to: '/settings/security', label: 'Security', icon: Shield },
  { to: '/settings/account', label: 'Account', icon: Settings },
];

export function SettingsNav() {
  return (
    <nav className="flex flex-wrap gap-1 mb-6 border-b pb-2">
      {settingsLinks.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          activeClassName="bg-muted text-foreground font-medium"
        >
          <link.icon className="mr-1.5 h-3.5 w-3.5 inline" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
