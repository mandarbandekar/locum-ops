import {
  LayoutDashboard, Building2, CalendarDays, FileText, LogOut, ShieldCheck, Settings,
  Receipt, Landmark, ChevronDown, Activity,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useData } from '@/contexts/DataContext';
import { computeInvoiceStatus } from '@/lib/businessLogic';
import locumOpsLogo from '@/assets/locumops-logo.png';
import { useMemo } from 'react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useBadgeCounts() {
  const { invoices } = useData();

  const draftInvoices = useMemo(
    () => invoices.filter(inv => computeInvoiceStatus(inv) === 'draft').length,
    [invoices],
  );

  return { draftInvoices };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { draftInvoices } = useBadgeCounts();

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Practice',
      items: [
        { title: 'Clinics & Facilities', url: '/facilities', icon: Building2 },
        { title: 'Schedule', url: '/schedule', icon: CalendarDays },
        { title: 'Invoices & Payments', url: '/invoices', icon: FileText, badge: draftInvoices },
      ],
    },
    {
      label: 'Back Office',
      items: [
        { title: 'Financial Health', url: '/business', icon: Activity },
        { title: 'Expenses & Mileage', url: '/expenses', icon: Receipt },
        { title: 'Credentials & CE', url: '/credentials', icon: ShieldCheck },
      ],
    },
    {
      label: 'Tax Center',
      items: [
        { title: 'Tax Estimate', url: '/tax-estimate', icon: Landmark },
        { title: 'CPA Prep', url: '/cpa-prep', icon: FileText },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-3">
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
          <img src={locumOpsLogo} alt="LocumOps" className="h-8 w-8 rounded-lg" />
          {!collapsed && (
            <span className="font-semibold text-[15px] tracking-tight text-sidebar-foreground">
              LocumOps
            </span>
          )}
        </div>

        {groups.map((group) => (
          <Collapsible key={group.label} defaultOpen className="group/collapsible">
            <SidebarGroup>
              {!collapsed && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between">
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5 px-2">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild size="lg">
                          <NavLink
                            to={item.url}
                            end={item.url === '/'}
                            className="hover:bg-sidebar-accent/60 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                          >
                            <item.icon className="mr-3 h-[18px] w-[18px] opacity-80" />
                            {!collapsed && (
                              <>
                                <span className="flex-1">{item.title}</span>
                                {!!item.badge && item.badge > 0 && (
                                  <Badge variant="secondary" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                                    {item.badge}
                                  </Badge>
                                )}
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <NavLink
                to="/settings/profile"
                className="hover:bg-sidebar-accent/60 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
              >
                <Settings className="mr-3 h-[18px] w-[18px] opacity-80" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button
          variant="ghost"
          size="lg"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/60 rounded-xl"
        >
          <LogOut className="mr-3 h-[18px] w-[18px] opacity-80" />
          {!collapsed && 'Logout'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
