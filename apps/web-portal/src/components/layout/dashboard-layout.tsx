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
    <div className="min-h-screen bg-page text-primary flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header - fixed at top */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content - scrollable area below header */}
        <main className="flex-1 bg-page overflow-auto scrollbar-clean">
          {children}
        </main>
      </div>
    </div>
  );
}