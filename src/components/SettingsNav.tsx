import { NavLink } from '@/components/NavLink';
import { User, CalendarDays, CreditCard, Bell, Briefcase, Shield, Settings, Calendar, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isFounderAdmin } from '@/lib/founderAccess';

const settingsLinks = [
  { to: '/settings/profile', label: 'Profile', icon: User },
  { to: '/settings/scheduling', label: 'Scheduling', icon: CalendarDays },
  { to: '/settings/calendar-sync', label: 'Calendar Sync', icon: Calendar },
  { to: '/settings/payments', label: 'Payments', icon: CreditCard },
  { to: '/settings/reminders', label: 'Reminders', icon: Bell },
  { to: '/settings/business-taxes', label: 'Business & Taxes', icon: Briefcase },
  { to: '/settings/security', label: 'Security', icon: Shield },
  { to: '/settings/account', label: 'Account', icon: Settings },
];

export function SettingsNav() {
  const { user } = useAuth();
  const showFounder = isFounderAdmin(user?.email);
  const links = showFounder
    ? [...settingsLinks, { to: '/settings/founder', label: 'Founder', icon: Crown }]
    : settingsLinks;

  return (
    <nav className="flex flex-wrap gap-1 mb-4 sm:mb-6 border-b pb-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
          activeClassName="bg-muted text-foreground font-medium"
        >
          <link.icon className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 inline" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
