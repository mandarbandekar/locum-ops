import { LayoutDashboard, Building2, CalendarDays, FileText, BarChart3, LogOut, ShieldCheck, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import locumOpsLogo from '@/assets/locumops-logo.png';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Practice Facilities', url: '/facilities', icon: Building2 },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Business', url: '/business', icon: BarChart3 },
  { title: 'Credentials', url: '/credentials', icon: ShieldCheck },
  { title: 'Settings', url: '/settings/profile', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();

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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg">
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/60 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-3 h-[18px] w-[18px] opacity-80" />
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
