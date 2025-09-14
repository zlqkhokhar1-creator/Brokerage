"use client";

import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { AIInsightsDashboard } from '@/components/dashboard/AIInsightsDashboard';

export default function AIInsightsPage() {
  return (
    <AppLayout>
      <Card className="p-6">
        <AIInsightsDashboard />
      </Card>
    </AppLayout>
  );
}


