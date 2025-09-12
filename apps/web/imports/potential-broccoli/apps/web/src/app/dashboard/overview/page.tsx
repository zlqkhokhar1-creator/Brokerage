'use client';

import { useState, useEffect } from 'react';
import ModernDashboardLayout from '@/components/ModernDashboardLayout';
import { AIInsightsDashboard } from '@/components/dashboard/AIInsightsDashboard';
import { RiskManagementDashboard } from '@/components/risk/RiskManagementDashboard';
import { PersonalizedDashboard } from '@/components/dashboard/PersonalizedDashboard';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { AdvancedSemanticSearch } from '@/components/ai/AdvancedSemanticSearch';
import { BehavioralInsights } from '@/components/insights/BehavioralInsights';
import { CommunitySentiment } from '@/components/community/CommunitySentiment';
import { AIDocumentation } from '@/components/ai/AIDocumentation';
import { BiasDetection } from '@/components/insights/BiasDetection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Settings, RefreshCw } from 'lucide-react';

// Track if user is on a mobile device
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default function ModernDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const isMobile = useIsMobile();

  // Toggle AI Assistant
  const toggleAIAssistant = () => {
    setShowAIAssistant(!showAIAssistant);
  };

  // Handle AI Assistant message send
  const handleAIMessage = (message: string) => {
    console.log('AI Message:', message);
    // Handle AI messages here (e.g., switch tabs, show specific content)
    if (message.toLowerCase().includes('portfolio')) {
      setActiveTab('overview');
    } else if (message.toLowerCase().includes('risk')) {
      setActiveTab('risk-management');
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 relative">
        {/* AI Assistant Floating Button - Only show on mobile or when not in AI chat tab */}
        {(!showAIAssistant || !isMobile) && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <div className="w-96 max-w-full">
              <AdvancedSemanticSearch />
            </div>
            <Button 
              onClick={toggleAIAssistant}
              className="rounded-full h-14 w-14 p-0 bg-primary hover:bg-primary/90 shadow-lg z-50"
              size="icon"
            >
              <span className="relative">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
              </span>
            </Button>
          </div>
        )}

        {/* Main Content */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <TabsList className="grid w-full md:w-auto grid-cols-5 mb-4 md:mb-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              <TabsTrigger value="risk-management">Risk</TabsTrigger>
              <TabsTrigger value="ai-search">AI Search</TabsTrigger>
              <TabsTrigger value="bias-detection">Bias Detection</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Button variant="outline" size="sm" className="h-9">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <TabsContent value="overview" className="space-y-6">
            <PersonalizedDashboard />
            <BehavioralInsights />
            <TabsContent value="ai-assistant" className="mt-0">
              <AIAssistant />
            </TabsContent>
            <TabsContent value="ai-search" className="mt-0">
              <AdvancedSemanticSearch />
            </TabsContent>
            <TabsContent value="bias-detection" className="mt-0">
              <BiasDetection />
            </TabsContent>
            <CommunitySentiment />
            <AIDocumentation />
          </TabsContent>
          
          <TabsContent value="ai-insights" className="mt-0">
            <Card className="p-6">
              <AIInsightsDashboard />
            </Card>
          </TabsContent>
          
          <TabsContent value="risk-management" className="mt-0">
            <Card className="p-6">
              <RiskManagementDashboard />
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Assistant Overlay */}
        {showAIAssistant && (
          <div className={`fixed ${isMobile ? 'inset-0' : 'bottom-6 right-6'} z-50`}>
            <AIAssistant />
          </div>
        )}
        
        {/* Overlay when AI Assistant is open on mobile */}
        {showAIAssistant && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAIAssistant(false)}
          />
        )}
      </div>
    </ModernDashboardLayout>
  );
}
