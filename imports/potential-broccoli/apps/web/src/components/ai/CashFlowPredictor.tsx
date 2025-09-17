/**
 * Advanced AI Analytics Components - Cash Flow Prediction
 * Provides predictive cash flow management for dividend portfolios
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, Info } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CashFlowPrediction {
  timeHorizon: string;
  totalPredictedCashFlow: number;
  monthlyBreakdown: Array<{
    month: number;
    predicted: number;
    confidence: number;
  }>;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
  reinvestmentOpportunities: string[];
}

interface CashFlowPredictorProps {
  portfolioId: string;
  className?: string;
}

export const CashFlowPredictor: React.FC<CashFlowPredictorProps> = ({ 
  portfolioId, 
  className = '' 
}) => {
  const [prediction, setPrediction] = useState<CashFlowPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState('1Y');
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/advanced/ai-analytics/cash-flow-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          portfolioId,
          timeHorizon
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cash flow prediction');
      }

      const data = await response.json();
      if (data.success) {
        setPrediction(data.data);
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
    if (portfolioId) {
      fetchPrediction();
    }
  }, [portfolioId, timeHorizon]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const chartData = prediction ? {
    labels: prediction.monthlyBreakdown.map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Predicted Cash Flow',
        data: prediction.monthlyBreakdown.map(item => item.predicted),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Confidence Range',
        data: prediction.monthlyBreakdown.map(item => item.predicted * item.confidence),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Predicted Monthly Cash Flow',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <span>Error: {error}</span>
          </div>
          <Button 
            onClick={fetchPrediction} 
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
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Flow Prediction
            </CardTitle>
            <CardDescription>
              AI-powered dividend and cash flow forecasting
            </CardDescription>
          </div>
          <Select value={timeHorizon} onValueChange={setTimeHorizon}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="2Y">2 Years</SelectItem>
              <SelectItem value="5Y">5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : prediction ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Total Predicted
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {formatCurrency(prediction.totalPredictedCashFlow)}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Time Horizon
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {prediction.timeHorizon}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">
                    Confidence
                  </span>
                </div>
                <div className={`text-2xl font-bold mt-1 ${getConfidenceColor(prediction.confidence)}`}>
                  {(prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData && (
              <div className="h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* Risk Factors */}
            {prediction.riskFactors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </h4>
                <div className="space-y-1">
                  {prediction.riskFactors.map((factor, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 rounded px-2 py-1">
                      • {factor}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  AI Recommendations
                </h4>
                <div className="space-y-1">
                  {prediction.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reinvestment Opportunities */}
            {prediction.reinvestmentOpportunities.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  Reinvestment Opportunities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {prediction.reinvestmentOpportunities.map((opportunity, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {opportunity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500">
            No prediction data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashFlowPredictor;