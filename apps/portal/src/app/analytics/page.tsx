"use client";

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
            <p className="text-gray-600">Advanced portfolio analytics and performance insights</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+12.4%</div>
                <p className="text-xs text-gray-500 mt-1">vs S&P 500: +8.2%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.85</div>
                <p className="text-xs text-gray-500 mt-1">Risk-adjusted return</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Beta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0.92</div>
                <p className="text-xs text-gray-500 mt-1">Market correlation</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">-8.3%</div>
                <p className="text-xs text-gray-500 mt-1">Peak to trough</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Stocks</span>
                    </div>
                    <span className="text-sm font-medium">65%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Bonds</span>
                    </div>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Cash</span>
                    </div>
                    <span className="text-sm font-medium">10%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{width: '10%'}}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Technology</span>
                    <span className="text-sm font-medium">28%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Healthcare</span>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Financial Services</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Consumer Cyclical</span>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Energy</span>
                    <span className="text-sm font-medium">8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Other</span>
                    <span className="text-sm font-medium">19%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Volatility (1Y)</span>
                    <span className="text-sm font-medium">14.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Value at Risk (95%)</span>
                    <span className="text-sm font-medium">-$2,840</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Correlation to S&P 500</span>
                    <span className="text-sm font-medium">0.87</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Information Ratio</span>
                    <span className="text-sm font-medium">0.65</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Asset Allocation</span>
                    <span className="text-sm font-medium text-green-600">+2.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Security Selection</span>
                    <span className="text-sm font-medium text-green-600">+1.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Market Timing</span>
                    <span className="text-sm font-medium text-red-600">-0.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Currency Impact</span>
                    <span className="text-sm font-medium">+0.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}




