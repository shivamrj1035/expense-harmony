"use client";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Receipt,
  FolderOpen,
  BarChart3,
  Settings,
  Wallet,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Categories", url: "/categories", icon: FolderOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-gradient">SpendWise</span>
        )}
      </div>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      href={item.url}
                      end
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* Sign out is handled by UserButton in the header for cleaner UI */}
        <p className="text-[10px] text-muted-foreground text-center">
          {!collapsed ? "SpendWise v1.0" : "v1.0"}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
