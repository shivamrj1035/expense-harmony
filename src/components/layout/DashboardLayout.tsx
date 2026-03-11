"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserButton, useUser } from "@clerk/nextjs";
import { NavLink } from "@/components/NavLink";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { PrivacyToggle } from "@/components/privacy/PrivacyToggle";
import { GlobalMonthPicker } from "./GlobalMonthPicker";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full mesh-gradient">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex flex-col border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50">
            <div className="h-[env(safe-area-inset-top)]" />
            <div className="h-16 flex items-center justify-between px-3 md:px-6 w-full">
              {/* Left Section: Sidebar & Date Picker */}
              <div className="flex items-center gap-1.5 sm:gap-4 flex-1 md:flex-none">
                <SidebarTrigger className="shrink-0" />
                <GlobalMonthPicker />
              </div>

              {/* Center Section: App Title */}
              <div className="flex items-center justify-center flex-1 gap-2 absolute left-1/2 -translate-x-1/2">
                <NavLink
                  href="/dashboard"
                  end
                  className="text-xl md:text-2xl font-black tracking-tighter text-gradient hover:opacity-80 transition-opacity"
                >
                  SpendWise
                </NavLink>
                <div className="hidden md:block">
                  <PrivacyToggle />
                </div>
              </div>

              {/* Right Section: Privacy Toggle (Mobile) & Profile */}
              <div className="flex items-center justify-end gap-2 sm:gap-4 flex-1 md:flex-none">
                <div className="md:hidden">
                    <PrivacyToggle />
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
      <PushNotificationManager />
    </SidebarProvider>
  );
}
