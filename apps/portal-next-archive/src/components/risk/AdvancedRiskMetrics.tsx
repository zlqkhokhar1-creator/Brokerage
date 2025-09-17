'use client';

import React from 'react';

interface MetricProps {
  name: string;
  value: string;
  change: number;
  description: string;
  benchmark: string;
  status: 'good' | 'normal' | 'elevated' | 'high';
  trend: 'up' | 'down' | 'stable';
}

interface RiskCategory {
  [key: string]: MetricProps[];
}
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Info, 
  AlertTriangle, 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Gauge,
  LineChart,
  PieChart,
  BarChart3,
  Table as TableIcon,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

// Mock data for risk metrics
const riskData: RiskCategory = {
  // Absolute Risk Measures
  absolute: [
    { 
      name: 'Standard Deviation (Volatility)', 
      value: '15.7%', 
      change: 0.8,
      description: 'Measures the dispersion of returns around the mean, indicating price fluctuation.',
      benchmark: '12.3%',
      status: 'elevated',
      trend: 'up'
    },
    { 
      name: 'Downside Deviation', 
      value: '9.2%', 
      change: -0.3,
      description: 'Measures the volatility of negative returns below a target (0% in this case).',
      benchmark: '8.5%',
      status: 'normal',
      trend: 'down'
    },
    { 
      name: 'Maximum Drawdown', 
      value: '18.5%', 
      change: 2.1,
      description: 'Largest peak-to-trough decline in portfolio value over the period.',
      benchmark: '15.0%',
      status: 'elevated',
      trend: 'up'
    },
    { 
      name: 'Value at Risk (95%)', 
      value: '$8,250', 
      change: 1.2,
      description: 'Maximum expected loss over 1 day with 95% confidence.',
      benchmark: '$7,500',
      status: 'normal',
      trend: 'up'
    },
    { 
      name: 'Conditional VaR (95%)', 
      value: '$12,400', 
      change: 0.5,
      description: 'Average loss expected when losses exceed VaR (95%).',
      benchmark: '$11,200',
      status: 'normal',
      trend: 'up'
    },
  ],
  
  // Relative Risk Measures
  relative: [
    { 
      name: 'Beta', 
      value: '1.23', 
      change: 0.1,
      description: 'Sensitivity to market movements (S&P 500 as benchmark).',
      benchmark: '1.00',
      status: 'elevated',
      trend: 'up'
    },
    { 
      name: 'Tracking Error', 
      value: '6.8%', 
      change: -0.2,
      description: 'Standard deviation of active returns vs benchmark.',
      benchmark: '5.0%',
      status: 'elevated',
      trend: 'down'
    },
    { 
      name: 'R-Squared', 
      value: '0.89', 
      change: 0.0,
      description: 'Percentage of portfolio movements explained by the benchmark.',
      benchmark: '>0.80',
      status: 'normal',
      trend: 'stable'
    },
    { 
      name: 'Correlation to S&P 500', 
      value: '0.94', 
      change: 0.0,
      description: 'How closely the portfolio moves with the S&P 500.',
      benchmark: '0.85',
      status: 'elevated',
      trend: 'stable'
    },
  ],
  
  // Risk-Adjusted Performance
  performance: [
    { 
      name: 'Sharpe Ratio (1Y)', 
      value: '1.85', 
      change: 0.2,
      description: 'Excess return per unit of total risk (risk-free rate = 3.5%).',
      benchmark: '1.50',
      status: 'good',
      trend: 'up'
    },
    { 
      name: 'Sortino Ratio (1Y)', 
      value: '2.32', 
      change: 0.3,
      description: 'Excess return per unit of downside risk.',
      benchmark: '1.80',
      status: 'good',
      trend: 'up'
    },
    { 
      name: 'Treynor Ratio', 
      value: '0.12', 
      change: 0.0,
      description: 'Excess return per unit of systematic risk (beta).',
      benchmark: '0.10',
      status: 'good',
      trend: 'stable'
    },
    { 
      name: 'Information Ratio', 
      value: '0.65', 
      change: -0.1,
      description: 'Excess return per unit of active risk vs benchmark.',
      benchmark: '0.50',
      status: 'good',
      trend: 'down'
    },
  ],
  
  // Portfolio-Level Metrics
  portfolio: [
    { 
      name: 'Portfolio Diversification Score', 
      value: '78/100', 
      change: 2,
      description: 'Measures how well diversified the portfolio is across assets and sectors.',
      benchmark: '>70',
      status: 'good',
      trend: 'up'
    },
    { 
      name: 'Leverage Ratio', 
      value: '1.8x', 
      change: 0.0,
      description: 'Total borrowed funds relative to equity.',
      benchmark: '2.0x',
      status: 'normal',
      trend: 'stable'
    },
    { 
      name: 'Liquidity Score', 
      value: 'High', 
      change: 0,
      description: 'Ability to liquidate positions without significant price impact.',
      benchmark: 'High',
      status: 'good',
      trend: 'stable'
    },
    { 
      name: 'Expense Ratio', 
      value: '0.45%', 
      change: 0.0,
      description: 'Annual fees as a percentage of assets under management.',
      benchmark: '0.50%',
      status: 'good',
      trend: 'stable'
    },
  ]
};

// Helper component for metric cards
const MetricCard: React.FC<MetricProps> = ({ 
  name, 
  value, 
  change, 
  description, 
  benchmark, 
  status, 
  trend 
}) => {
  const isPositive = change >= 0;
  const isNegative = change < 0;
  
  const statusColors = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    elevated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{description}</p>
                <p className="text-xs mt-1 text-muted-foreground">Benchmark: {benchmark}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-1">
          <Badge variant="outline" className={`text-xs ${
            status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            status === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            status === 'elevated' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          {change !== 0 && (
            <span className={`ml-2 text-sm flex items-center ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function AdvancedRiskMetrics() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Comprehensive Risk Metrics</h3>
        <p className="text-sm text-muted-foreground">
          Detailed risk analysis across multiple dimensions. Hover over metrics for more information.
        </p>
      </div>
      
      <Tabs defaultValue="absolute" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="absolute" className="flex items-center gap-1">
            <Gauge className="h-4 w-4" />
            <span>Absolute Risk</span>
          </TabsTrigger>
          <TabsTrigger value="relative" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>Relative Risk</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <LineChart className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-1">
            <PieChart className="h-4 w-4" />
            <span>Portfolio</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="absolute" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {riskData.absolute.map((metric, index) => (
              <MetricCard key={`absolute-${index}`} {...metric} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="relative" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {riskData.relative.map((metric, index) => (
              <MetricCard key={`relative-${index}`} {...metric} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {riskData.performance.map((metric, index) => (
              <MetricCard key={`performance-${index}`} {...metric} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {riskData.portfolio.map((metric, index) => (
              <MetricCard key={`portfolio-${index}`} {...metric} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-3">Key Risk Indicators</h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Sector Concentration</CardTitle>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                  Elevated
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42% in Tech</div>
              <p className="text-sm text-muted-foreground mt-1">
                Top 3 sectors: Tech (42%), Healthcare (18%), Financials (15%)
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Liquidity Risk</CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Low
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">High</div>
              <p className="text-sm text-muted-foreground mt-1">
                95% of portfolio in highly liquid assets
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Margin Utilization</CardTitle>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Normal
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,450 / $50,000</div>
              <p className="text-sm text-muted-foreground mt-1">
                24.9% of available margin used
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdvancedRiskMetrics;
