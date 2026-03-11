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
  PieChart,
  CircleDollarSign,
} from "lucide-react";
import { usePrivacyStore } from "@/store/privacyStore";
import { useState, useEffect } from "react";
import { getUserSettings } from "@/app/actions/user";

export function AppSidebar() {
  const { state } = useSidebar();
  const { isPrivacyUnlocked } = usePrivacyStore();
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const collapsed = state === "collapsed";

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await getUserSettings();
        setIsPrivacyEnabled(!!settings?.isPrivacyEnabled);
      } catch (error) {
        console.error("Failed to fetch privacy settings:", error);
      }
    }
    fetchSettings();
  }, []);

  const isPrivacyActive = isPrivacyEnabled && !isPrivacyUnlocked;

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Expenses", url: "/expenses", icon: Receipt },
    { title: "Categories", url: "/categories", icon: FolderOpen },
    { title: "Stock Analysis", url: "/stocks", icon: BarChart3, hideOnPrivacy: true },
    { title: "Mutual Funds", url: "/mutual-funds", icon: PieChart, hideOnPrivacy: true },
    { title: "Settings", url: "/settings", icon: Settings },
  ].filter(item => !(isPrivacyActive && item.hideOnPrivacy));

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <div className="flex flex-col border-b border-sidebar-border">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-gradient">SpendWise</span>
          )}
        </div>
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
                  <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent">
                    <NavLink
                      href={item.url}
                      end
                      className="group relative flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 hover:bg-white/5 active:scale-[0.98]"
                      activeClassName="bg-primary/10 text-primary"
                    >
                      {/* Active Indicator Bar */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary opacity-0 transition-all duration-300 group-[.active]:opacity-100 group-[.active]:h-10 glow-primary" />

                      {/* Active Background Glow */}
                      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 transition-all duration-300 group-[.active]:opacity-100" />

                      <item.icon className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-[.active]:scale-110" />
                      {!collapsed && (
                        <span className="relative z-10 font-medium tracking-wide">
                          {item.title}
                        </span>
                      )}
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
