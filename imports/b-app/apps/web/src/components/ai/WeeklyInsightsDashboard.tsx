/**
 * Weekly Insights Dashboard - AI-generated personalized insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  BookOpen,
  RefreshCw,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';

interface WeeklyInsights {
  summary: string;
  portfolioPerformance: {
    weeklyReturn: number;
    benchmark: number;
    outperformance: number;
  };
  marketTrends: string[];
  recommendations: string[];
  riskAlerts: string[];
  opportunities: string[];
  educationalContent: string[];
  generatedAt: string;
}

interface WeeklyInsightsDashboardProps {
  className?: string;
}

export const WeeklyInsightsDashboard: React.FC<WeeklyInsightsDashboardProps> = ({ 
  className = '' 
}) => {
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeeklyInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/advanced/ai-analytics/weekly-insights', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly insights');
      }

      const data = await response.json();
      if (data.success) {
        setInsights(data.data);
        setLastUpdated(new Date());
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
    fetchWeeklyInsights();
  }, []);

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const performanceChartData = insights ? {
    labels: ['Portfolio Return', 'Benchmark Return'],
    datasets: [
      {
        data: [
          Math.abs(insights.portfolioPerformance.weeklyReturn),
          Math.abs(insights.portfolioPerformance.benchmark)
        ],
        backgroundColor: [
          insights.portfolioPerformance.weeklyReturn >= 0 ? '#10b981' : '#ef4444',
          '#6b7280'
        ],
        borderWidth: 0,
      },
    ],
  } : null;

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <span>Error: {error}</span>
          </div>
          <Button 
            onClick={fetchWeeklyInsights} 
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Weekly AI Insights
              </CardTitle>
              <CardDescription>
                Personalized market analysis and portfolio recommendations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {lastUpdated.toLocaleDateString()}
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchWeeklyInsights}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </CardContent>
          </Card>

          {/* Portfolio Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Portfolio Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Weekly Return</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(insights.portfolioPerformance.weeklyReturn)}`}>
                    {formatPercentage(insights.portfolioPerformance.weeklyReturn)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">vs Benchmark</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(insights.portfolioPerformance.outperformance)}`}>
                    {formatPercentage(insights.portfolioPerformance.outperformance)}
                  </div>
                </div>
              </div>
              
              {performanceChartData && (
                <div className="h-32 flex justify-center">
                  <Doughnut 
                    data={performanceChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.marketTrends.map((trend, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{trend}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Alerts */}
          {insights.riskAlerts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.riskAlerts.map((alert, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <span className="text-sm text-red-800">{alert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.opportunities.map((opportunity, index) => (
                  <div key={index} className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-green-800">{opportunity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Educational Content */}
          {insights.educationalContent.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Recommended Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insights.educationalContent.map((content, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-gray-200">
                      {content}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No insights available
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeeklyInsightsDashboard;