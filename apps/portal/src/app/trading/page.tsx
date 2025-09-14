"use client";

import { SimpleTrading } from '@/components/trading/SimpleTrading';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

export default function TradingPage() {
  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <SimpleTrading />
    </Shell>
  );
}
