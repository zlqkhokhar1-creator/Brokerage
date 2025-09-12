/**
 * Morning Briefing Component - Personalized daily market briefing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sun, 
  Newspaper, 
  TrendingUp, 
  Calendar, 
  CheckSquare, 
  RefreshCw,
  CloudSun,
  AlertCircle
} from 'lucide-react';

interface MorningBriefing {
  greeting: string;
  marketSummary: string;
  portfolioUpdates: string[];
  newsHighlights: string[];
  todaysEvents: string[];
  actionItems: string[];
  weatherForecast: string;
  generatedAt: string;
}

interface MorningBriefingProps {
  className?: string;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({ 
  className = '' 
}) => {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMorningBriefing = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/advanced/ai-analytics/morning-briefing', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch morning briefing');
      }

      const data = await response.json();
      if (data.success) {
        setBriefing(data.data);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMorningBriefing();
  }, []);

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <span>Error: {error}</span>
          </div>
          <Button 
            onClick={fetchMorningBriefing} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Greeting */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <Sun className="h-5 w-5" />
                <span className="text-sm">{new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-64 bg-blue-300" />
              ) : (
                <h1 className="text-2xl font-bold">
                  {briefing?.greeting || `${getCurrentGreeting()}!`}
                </h1>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchMorningBriefing}
              disabled={loading}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : briefing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Market Summary */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4" />
                Market Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{briefing.marketSummary}</p>
            </CardContent>
          </Card>

          {/* Market Weather */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CloudSun className="h-4 w-4" />
                Market Weather
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl mb-2">🌤️</div>
                <p className="text-sm text-gray-600">{briefing.weatherForecast}</p>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Updates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4" />
                Portfolio Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.portfolioUpdates.length > 0 ? (
                  briefing.portfolioUpdates.map((update, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{update}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No portfolio updates today</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* News Highlights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Newspaper className="h-4 w-4" />
                News Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {briefing.newsHighlights.length > 0 ? (
                  briefing.newsHighlights.map((news, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-3">
                      <span className="text-sm text-blue-800">{news}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No major news today</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Today's Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.todaysEvents.length > 0 ? (
                  briefing.todaysEvents.map((event, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{event}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No scheduled events</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="h-4 w-4" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.actionItems.length > 0 ? (
                  briefing.actionItems.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No action items today</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  View Portfolio
                </Button>
                <Button variant="outline" size="sm">
                  Check Watchlist
                </Button>
                <Button variant="outline" size="sm">
                  Market News
                </Button>
                <Button variant="outline" size="sm">
                  Economic Calendar
                </Button>
                <Button variant="outline" size="sm">
                  Trading Ideas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No briefing available
          </CardContent>
        </Card>
      )}

      {briefing && (
        <div className="text-center text-xs text-gray-400">
          Generated at {formatTime(briefing.generatedAt)}
        </div>
      )}
    </div>
  );
};

export default MorningBriefing;