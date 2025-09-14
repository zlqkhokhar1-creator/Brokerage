"use client";

import { ReactNode } from 'react';
import { ModernSidebar } from '@/components/navigation/ModernSidebar';
import { ModernTopBar } from '@/components/shell/ModernTopBar';
import { ModernWorkspaceTabs } from '@/components/shell/ModernWorkspaceTabs';

interface ShellProps {
  children: ReactNode;
  right?: ReactNode;
  showTopBar?: boolean;
  showWorkspaceTabs?: boolean;
}

export function Shell({
  children,
  right,
  showTopBar = true,
  showWorkspaceTabs = true
}: ShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <ModernSidebar />

      {/* Main content area with modern spacing */}
      <div className="flex-1 flex flex-col transition-all duration-300 lg:ml-80">
        {/* Top bar - optional */}
        {showTopBar && <ModernTopBar />}

        {/* Workspace tabs - optional */}
        {showWorkspaceTabs && <ModernWorkspaceTabs />}

        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-0 overflow-hidden">
          {/* Primary content */}
          <main className="min-w-0 overflow-auto bg-background p-6">
            {children}
          </main>

          {/* Right sidebar - AI insights panel */}
          {right && (
            <aside className="hidden xl:block border-l border-border/50 bg-card-secondary/50 backdrop-blur-xl overflow-auto p-6">
              {right}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

