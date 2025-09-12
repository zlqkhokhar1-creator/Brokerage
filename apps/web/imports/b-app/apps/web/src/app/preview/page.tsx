"use client";

import React from 'react';
import EnhancedRiskManagementDashboard from '@/components/enhanced/RiskManagementDashboard';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Palette, Layout, Zap, Eye } from 'lucide-react';

const PreviewPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      {/* Enhanced Navigation */}
      <EnhancedNavigation currentPath="/preview" />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="space-y-8 p-6">
          {/* Preview Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Eye className="w-8 h-8 text-blue-600" />
                <h1 className="text-4xl font-bold text-slate-900">UI Enhancement Preview</h1>
              </div>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Experience the enhanced brokerage platform UI with improved design system, 
                better accessibility, and modern interactions.
              </p>
              
              {/* Design Principles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Palette className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Beautiful UI</h3>
                    <p className="text-sm text-slate-600">
                      60-30-10 color scheme, consistent typography, and purposeful animations
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Layout className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Great UX</h3>
                    <p className="text-sm text-slate-600">
                      Intuitive navigation, minimal friction, and fast load times
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">Accessible</h3>
                    <p className="text-sm text-slate-600">
                      WCAG compliant, keyboard navigation, and responsive design
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Enhancement Features */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">Enhanced Colors</Badge>
                <Badge className="bg-green-50 text-green-700 border-green-200">Better Typography</Badge>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200">Micro-interactions</Badge>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">Improved Spacing</Badge>
                <Badge className="bg-pink-50 text-pink-700 border-pink-200">Visual Hierarchy</Badge>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Accessibility</Badge>
              </div>
            </div>
          </div>

          {/* Enhanced Component Demo */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Enhanced Risk Management Dashboard</h2>
              <p className="text-slate-600">
                See the improved design system in action with better visual hierarchy and user experience
              </p>
            </div>
            
            {/* Risk Management Dashboard */}
            <EnhancedRiskManagementDashboard />
          </div>

          {/* Design System Showcase */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Design System Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Palette */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Color Palette (60-30-10 Rule)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Primary (60%)</p>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded"></div>
                      <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded"></div>
                      <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Secondary (30%)</p>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded"></div>
                      <div className="w-8 h-8 bg-blue-600 rounded"></div>
                      <div className="w-8 h-8 bg-blue-700 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Accent (10%)</p>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 bg-green-500 rounded"></div>
                      <div className="w-8 h-8 bg-red-500 rounded"></div>
                      <div className="w-8 h-8 bg-amber-500 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Typography Scale</h4>
                <div className="space-y-2">
                  <p className="text-4xl font-bold text-slate-900">Heading 1 - 36px Bold</p>
                  <p className="text-3xl font-semibold text-slate-900">Heading 2 - 30px Semibold</p>
                  <p className="text-2xl font-semibold text-slate-900">Heading 3 - 24px Semibold</p>
                  <p className="text-lg text-slate-700">Body Large - 18px Regular</p>
                  <p className="text-base text-slate-600">Body Base - 16px Regular</p>
                  <p className="text-sm text-slate-500">Body Small - 14px Regular</p>
                </div>
              </div>

              {/* Interactive Elements */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Interactive Elements</h4>
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:shadow-md">
                    Primary Button
                  </Button>
                  <Button variant="outline" className="transition-all duration-200 hover:shadow-md">
                    Secondary Button
                  </Button>
                  <Button variant="ghost" className="transition-all duration-200">
                    Ghost Button
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;
