"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import PortalShell from '@/components/PortalShell';
import EnhancedRiskManagementDashboard from '@/components/enhanced/RiskManagementDashboard';
import { ModernDashboard } from '@/components/ModernDashboard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <PortalShell currentPath="/dashboard">
        <Tabs 
          defaultValue="portfolio" 
          className="w-full"
          onValueChange={(value) => setActiveTab(value)}
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="portfolio">Portfolio Overview</TabsTrigger>
              <TabsTrigger value="risk">Risk Management</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="portfolio" className="mt-0">
            <Card className="p-6">
              <ModernDashboard />
            </Card>
          </TabsContent>
          
          <TabsContent value="risk" className="mt-0">
            <Card className="p-6">
              <EnhancedRiskManagementDashboard />
            </Card>
          </TabsContent>
        </Tabs>
    </PortalShell>
  );
}