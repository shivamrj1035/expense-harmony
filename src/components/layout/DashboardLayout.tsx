"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserButton, useUser } from "@clerk/nextjs";

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
            <div className="h-16 flex items-center gap-4 px-4 lg:px-6">
              <SidebarTrigger className="shrink-0" />
              <div className="flex-1" />
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
