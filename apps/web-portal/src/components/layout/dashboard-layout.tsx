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
      <div className="flex-1 flex flex-col min-w-0 pb-9">
        {/* Header - fixed at top */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content - scrollable area below header */}
        <main className="flex-1 bg-background overflow-auto scrollbar-professional">
          <div className="page-spacing">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}