"use client";

import React from 'react';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';

export const dynamic = 'force-dynamic';

export default function PortfolioPage() {
  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      <EnhancedNavigation currentPath="/portfolio" />
      <div className="lg:pl-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Overview</h1>
            <p className="text-gray-600">Manage and track your investment portfolio</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
              <p className="text-3xl font-bold text-green-600">$52,300.00</p>
              <p className="text-sm text-gray-500 mt-1">+2.3% today</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Gain/Loss</h3>
              <p className="text-3xl font-bold text-green-600">+$3,240.00</p>
              <p className="text-sm text-gray-500 mt-1">+6.6% all time</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cash Available</h3>
              <p className="text-3xl font-bold text-gray-900">$8,750.00</p>
              <p className="text-sm text-gray-500 mt-1">Ready to invest</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Holdings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Symbol</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Shares</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Avg Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Current Price</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Market Value</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">AAPL</td>
                    <td className="py-3 px-4">100</td>
                    <td className="py-3 px-4">$150.00</td>
                    <td className="py-3 px-4">$175.43</td>
                    <td className="py-3 px-4">$17,543.00</td>
                    <td className="py-3 px-4 text-green-600">+$2,543.00</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">GOOGL</td>
                    <td className="py-3 px-4">10</td>
                    <td className="py-3 px-4">$2,800.00</td>
                    <td className="py-3 px-4">$2,847.63</td>
                    <td className="py-3 px-4">$28,476.30</td>
                    <td className="py-3 px-4 text-green-600">+$476.30</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">TSLA</td>
                    <td className="py-3 px-4">25</td>
                    <td className="py-3 px-4">$250.00</td>
                    <td className="py-3 px-4">$248.42</td>
                    <td className="py-3 px-4">$6,210.50</td>
                    <td className="py-3 px-4 text-red-600">-$39.50</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



