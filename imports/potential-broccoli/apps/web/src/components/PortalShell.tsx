"use client";

import React, { PropsWithChildren } from 'react';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import Topbar from '@/components/ui/Topbar';

type Props = PropsWithChildren<{
  currentPath: string;
}>;

export default function PortalShell({ currentPath, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavigation currentPath={currentPath} />
      <div className="lg:pl-64">
        <Topbar />
        <main id="main" role="main" className="p-6 outline-none focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

