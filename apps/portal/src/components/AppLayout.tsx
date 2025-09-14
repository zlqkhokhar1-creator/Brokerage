"use client";
'use client';

import React from 'react';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AIInsightCard() {
  return (
    <div className="ai-card p-4 rounded-lg space-y-4">
      <h4 className="font-semibold text-card-foreground">AI Recommendation</h4>
      <p className="text-sm text-muted-foreground">Stub for AI insights from /ai-recommendations. Full implementation pending.</p>
      <div className="ai-pulse bg-gradient-to-r from-teal-400 to-amber-400 h-2 rounded-full"></div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Shell right={<InspectorPanel />}>{children}</Shell>
  );
}