"use client";

import { SimplePortfolio } from '@/components/portfolio/SimplePortfolio';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

export default function PortfolioPage() {
  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <SimplePortfolio />
    </Shell>
  );
}
