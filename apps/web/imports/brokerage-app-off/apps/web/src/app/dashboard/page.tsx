"use client";

import React from 'react';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import EnhancedRiskManagementDashboard from '@/components/enhanced/RiskManagementDashboard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      <EnhancedNavigation currentPath="/dashboard" />
      <div className="lg:pl-64">
        <EnhancedRiskManagementDashboard />
      </div>
    </div>
  );
}