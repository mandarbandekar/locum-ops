import {
  LayoutDashboard, Building2, CalendarDays, FileText, ShieldCheck, Settings,
  Receipt, Landmark, TrendingUp, Crown,
} from 'lucide-react';
import { isFounderAdmin } from '@/lib/founderAccess';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuickAddMenu } from '@/components/QuickAddMenu';
import locumOpsEmblem from '@/assets/locumops-emblem.png';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeVariant?: 'secondary' | 'destructive' | 'warning';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useBadgeCounts() {
  const { invoices } = useData();
  const { user, isDemo } = useAuth();

  const draftInvoices = useMemo(
    () => invoices.filter(inv => computeInvoiceStatus(inv) === 'draft').length,
    [invoices],
  );

  const overdueInvoices = useMemo(
    () => invoices.filter(inv => computeInvoiceStatus(inv) === 'overdue').length,
    [invoices],
  );

  const { data: expiringCredentials = 0 } = useQuery({
    queryKey: ['sidebar-expiring-credentials', user?.id],
    queryFn: async () => {
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
      const { count, error } = await supabase
        .from('credentials')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'expiring_soon'])
        .lte('expiration_date', sixtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiration_date', new Date().toISOString().split('T')[0]);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user && !isDemo,
    staleTime: 5 * 60 * 1000,
  });

  const totalInvoiceBadge = draftInvoices + overdueInvoices;
  const invoiceBadgeVariant: NavItem['badgeVariant'] = overdueInvoices > 0 ? 'destructive' : 'secondary';
  const credentialBadgeVariant: NavItem['badgeVariant'] = expiringCredentials > 0 ? 'warning' : 'secondary';

  return {
    totalInvoiceBadge,
    invoiceBadgeVariant,
    expiringCredentials,
    credentialBadgeVariant,
  };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user } = useAuth();
  const showFounder = isFounderAdmin(user?.email);

  const {
    totalInvoiceBadge,
    invoiceBadgeVariant,
    expiringCredentials,
    credentialBadgeVariant,
  } = useBadgeCounts();

  const groups: NavGroup[] = [
    {
      label: 'Work',
      items: [
        { title: 'Today', url: '/', icon: LayoutDashboard },
        { title: 'Schedule', url: '/schedule', icon: CalendarDays },
        { title: 'Clinics', url: '/facilities', icon: Building2 },
      ],
    },
    {
      label: 'Money',
      items: [
        { title: 'Invoices', url: '/invoices', icon: FileText, badge: totalInvoiceBadge, badgeVariant: invoiceBadgeVariant },
        { title: 'Expenses & Mileage', url: '/expenses', icon: Receipt },
        { title: 'Business Insights', url: '/business', icon: TrendingUp },
        { title: 'Tax Intelligence', url: '/tax-center', icon: Landmark },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { title: 'Credentials & CE', url: '/credentials', icon: ShieldCheck, badge: expiringCredentials, badgeVariant: credentialBadgeVariant },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-3 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
        {/* Brand lockup */}
        <div className={`flex items-center gap-2.5 px-4 py-3 ${collapsed ? 'justify-center px-2' : ''}`}>
          <img src={locumOpsEmblem} alt="" className="h-7 w-7 shrink-0 object-contain" />
          {!collapsed && (
            <span
              className="font-semibold text-[16px] tracking-tight"
              style={{ color: 'hsl(var(--sidebar-logo-text))', fontFamily: 'DM Sans, sans-serif' }}
            >
              LocumOps
            </span>
          )}
        </div>

        {/* Quick Add */}
        <QuickAddMenu />

        {/* Nav groups */}
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="sidebar-group-label select-none">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-px px-2">
                {group.items.map((item) => {
                  const tourId = item.url === '/facilities' ? 'facilities'
                    : item.url === '/schedule' ? 'schedule'
                    : item.url === '/invoices' ? 'invoices'
                    : item.url === '/business' ? 'business'
                    : item.url === '/tax-center' ? 'tax'
                    : undefined;
                  return (
                    <SidebarMenuItem key={item.title} data-tour={tourId}>
                      <SidebarMenuButton asChild size="lg" tooltip={collapsed ? item.title : undefined}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className="sidebar-nav-item group/navitem"
                          activeClassName="sidebar-nav-item--active"
                        >
                          <item.icon className="mr-3 h-[18px] w-[18px] transition-all duration-150 text-[hsl(var(--sidebar-icon-inactive))] group-[.sidebar-nav-item--active]/navitem:text-primary-700" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.title}</span>
                              {!!item.badge && item.badge > 0 && (
                                <Badge
                                  variant={item.badgeVariant || 'secondary'}
                                  className="sidebar-badge ml-auto"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50 mt-auto">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={collapsed ? 'Settings' : undefined}>
              <NavLink
                to="/settings/profile"
                className="sidebar-nav-item sidebar-settings-item group/navitem"
                activeClassName="sidebar-nav-item--active"
              >
                <Settings className="mr-3 h-[18px] w-[18px] transition-all duration-150 text-[hsl(var(--sidebar-icon-inactive))] group-[.sidebar-nav-item--active]/navitem:text-primary-700" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
