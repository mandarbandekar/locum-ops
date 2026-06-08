import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Building2, Receipt, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/schedule', label: 'Calendar', icon: Calendar, match: (p: string) => p.startsWith('/schedule') },
  { to: '/facilities', label: 'Clinics', icon: Building2, match: (p: string) => p.startsWith('/facilities') },
  { to: '/invoices', label: 'Invoices', icon: Receipt, match: (p: string) => p.startsWith('/invoices') },
  { to: '/more', label: 'More', icon: MoreHorizontal, match: (p: string) => p.startsWith('/more') || p.startsWith('/settings') || p.startsWith('/credentials') || p.startsWith('/expenses') || p.startsWith('/business') || p.startsWith('/tax') },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.4]')} />
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
