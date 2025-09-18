'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 pb-9 md:pb-0">
        {/* Header - fixed at top */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content - scrollable area below header */}
        <main className="flex-1 bg-gradient-mesh bg-noise overflow-auto scrollbar-professional relative">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80 pointer-events-none"></div>

          <div className="page-spacing relative z-10 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}