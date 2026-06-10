import { NavLink } from '@/components/NavLink';
import { Link } from 'react-router-dom';
import { User, Calendar, DollarSign, Settings, ChevronLeft } from 'lucide-react';
import { useIsMobileShell } from '@/hooks/useIsMobileShell';

const settingsLinks = [
  { to: '/settings/profile', label: 'Profile', icon: User },
  { to: '/settings/calendar-sync', label: 'Calendar Sync', icon: Calendar },
  { to: '/settings/rate-card', label: 'Rate Card', icon: DollarSign },
  { to: '/settings/account', label: 'Your Account', icon: Settings },
];

export function SettingsNav() {
  const isMobile = useIsMobileShell();

  if (isMobile) {
    return (
      <div className="mb-3">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--m-primary))] -ml-1 py-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Link>
      </div>
    );
  }

  return (
    <nav className="flex flex-wrap gap-1 mb-4 sm:mb-6 border-b pb-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
      {settingsLinks.map(link => (
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
