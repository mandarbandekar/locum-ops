import {
  LayoutDashboard, Building2, CalendarDays, FileText, ShieldCheck, Settings,
  Receipt, Landmark, ChevronDown, Activity,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import locumOpsLogo from '@/assets/locumops-logo.png';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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

  // Credentials expiring within 60 days
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
    staleTime: 5 * 60 * 1000, // 5 min
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

  const {
    totalInvoiceBadge,
    invoiceBadgeVariant,
    expiringCredentials,
    credentialBadgeVariant,
  } = useBadgeCounts();

  const dashboardItem: NavItem = { title: 'Dashboard', url: '/', icon: LayoutDashboard };

  const groups: NavGroup[] = [
    {
      label: 'Practice',
      items: [
        { title: 'Clinics & Facilities', url: '/facilities', icon: Building2 },
        { title: 'Schedule', url: '/schedule', icon: CalendarDays },
        { title: 'Invoices & Payments', url: '/invoices', icon: FileText, badge: totalInvoiceBadge, badgeVariant: invoiceBadgeVariant },
      ],
    },
    {
      label: 'Back Office',
      items: [
        { title: 'Relief Business Hub', url: '/business', icon: Activity },
        { title: 'Expenses & Mileage', url: '/expenses', icon: Receipt },
        { title: 'Tax Intelligence', url: '/tax-center', icon: Landmark },
        { title: 'Credentials & CE', url: '/credentials', icon: ShieldCheck, badge: expiringCredentials, badgeVariant: credentialBadgeVariant },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-3 overflow-hidden">
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
          <img src={locumOpsLogo} alt="LocumOps" className="h-8 w-8 rounded-lg" />
          {!collapsed && (
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'hsl(var(--sidebar-logo-text))' }}>
              LocumOps
            </span>
          )}
        </div>
        {/* Dashboard - standalone item */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-px px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <NavLink
                    to="/"
                    end
                    className="sidebar-nav-item group/navitem"
                    activeClassName="sidebar-nav-item--active"
                  >
                    <LayoutDashboard className="mr-3 h-[18px] w-[18px] transition-all duration-150 text-[hsl(var(--sidebar-icon-inactive))] group-[.sidebar-nav-item--active]/navitem:text-white" />
                    {!collapsed && <span className="flex-1 truncate">Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <Collapsible key={group.label} defaultOpen className="group/collapsible">
            <SidebarGroup className="py-1">
              {!collapsed && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="sidebar-group-label cursor-pointer select-none flex items-center justify-between">
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
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
                        <SidebarMenuButton asChild size="lg">
                          <NavLink
                            to={item.url}
                            end={item.url === '/'}
                            className="sidebar-nav-item group/navitem"
                            activeClassName="sidebar-nav-item--active"
                          >
                            <item.icon className="mr-3 h-[18px] w-[18px] transition-all duration-150 text-[hsl(var(--sidebar-icon-inactive))] group-[.sidebar-nav-item--active]/navitem:text-white" />
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <NavLink
                to="/settings/profile"
                className="sidebar-nav-item sidebar-settings-item group/navitem"
                activeClassName="sidebar-nav-item--active"
              >
                <Settings className="mr-3 h-[18px] w-[18px] transition-all duration-150 text-[hsl(var(--sidebar-icon-inactive))] group-[.sidebar-nav-item--active]/navitem:text-white" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
