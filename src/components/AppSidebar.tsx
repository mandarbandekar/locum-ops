import { LayoutDashboard, Building2, CalendarDays, Mail, CheckCircle, FileText, BarChart3, LogOut, ShieldCheck, Calculator, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Facilities', url: '/facilities', icon: Building2 },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays },
  { title: 'Outreach', url: '/outreach', icon: Mail },
  { title: 'Confirmations', url: '/confirmations', icon: CheckCircle },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Credentials', url: '/credentials', icon: ShieldCheck },
  { title: 'Taxes', url: '/taxes', icon: Calculator },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Settings', url: '/settings/profile', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary font-bold tracking-wider text-xs uppercase mb-3 px-4">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5 px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg">
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50 rounded-lg px-3 py-2.5 text-[0.925rem]"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button variant="ghost" size="lg" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary rounded-lg">
          <LogOut className="mr-3 h-5 w-5" />
          {!collapsed && 'Logout'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
