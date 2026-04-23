import { Plus, CalendarPlus, Building2, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function QuickAddMenu() {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const actions = [
    { label: 'Add Shift', icon: CalendarPlus, to: '/schedule?new=1' },
    { label: 'Add Clinic', icon: Building2, to: '/facilities?new=1' },
    { label: 'Add Invoice', icon: FileText, to: '/invoices?new=1' },
    { label: 'Log Expense', icon: Receipt, to: '/expenses?new=1' },
  ];

  return (
    <div className={cn('px-3 pb-2', collapsed && 'px-2')}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size={collapsed ? 'icon' : 'default'}
            className={cn(
              'h-10 gap-2 font-medium shadow-soft',
              collapsed ? 'w-10 mx-auto' : 'w-full',
            )}
            aria-label="Quick add"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>Quick Add</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Create
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => navigate(action.to)}
              className="cursor-pointer gap-2.5 py-2"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              <span>{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
