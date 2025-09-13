'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type BiasType = 
  | 'confirmation' 
  | 'overconfidence' 
  | 'lossAversion' 
  | 'recency' 
  | 'anchoring' 
  | 'herdMentality';

type BiasSeverity = 'low' | 'medium' | 'high';

interface Bias {
  id: string;
  type: BiasType;
  severity: BiasSeverity;
  confidence: number;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  detectedAt: Date;
  affectedAssets?: string[];
  trend?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
}

const biasData: Record<BiasType, Omit<Bias, 'id' | 'detectedAt' | 'affectedAssets' | 'trend' | 'trendPercentage'>> = {
  confirmation: {
    type: 'confirmation',
    severity: 'medium',
    confidence: 82,
    title: 'Confirmation Bias Detected',
    description: 'You tend to favor information that confirms your existing beliefs about certain stocks.',
    impact: 'May cause you to overlook warning signs or alternative perspectives.',
    recommendation: 'Actively seek out and consider information that contradicts your current positions.'
  },
  overconfidence: {
    type: 'overconfidence',
    severity: 'high',
    confidence: 91,
    title: 'Overconfidence Detected',
    description: 'Your recent trading activity suggests you may be overestimating your ability to predict market movements.',
    impact: 'Can lead to excessive trading, higher risk-taking, and lower returns.',
    recommendation: 'Review your trade history and consider a more diversified, long-term strategy.'
  },
  lossAversion: {
    type: 'lossAversion',
    severity: 'high',
    confidence: 88,
    title: 'Loss Aversion Detected',
    description: 'You tend to hold onto losing positions too long while quickly selling winners.',
    impact: 'May result in missing out on gains and compounding losses.',
    recommendation: 'Set stop-loss orders and stick to them to manage risk effectively.'
  },
  recency: {
    type: 'recency',
    severity: 'medium',
    confidence: 75,
    title: 'Recency Bias Detected',
    description: 'Your recent trades show a pattern of overemphasizing recent market events.',
    impact: 'May cause you to make decisions based on short-term fluctuations rather than long-term fundamentals.',
    recommendation: 'Focus on long-term trends and fundamentals rather than short-term market movements.'
  },
  anchoring: {
    type: 'anchoring',
    severity: 'low',
    confidence: 65,
    title: 'Anchoring Bias Detected',
    description: 'You may be relying too heavily on the first piece of information you received about certain stocks.',
    impact: 'Can prevent you from adjusting your views as new information becomes available.',
    recommendation: 'Regularly reassess your investments with fresh data and analysis.'
  },
  herdMentality: {
    type: 'herdMentality',
    severity: 'high',
    confidence: 85,
    title: 'Herd Mentality Detected',
    description: 'Your trading patterns align closely with market sentiment and popular trends.',
    impact: 'May lead to buying high and selling low by following the crowd.',
    recommendation: 'Develop an independent investment thesis and stick to your strategy.'
  }
};

const getBiasSeverityColor = (severity: BiasSeverity) => {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getBiasIcon = (severity: BiasSeverity) => {
  switch (severity) {
    case 'high':
      return <AlertCircle className="h-5 w-5" />;
    case 'medium':
      return <AlertTriangle className="h-5 w-5" />;
    case 'low':
      return <Info className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable' | undefined) => {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case 'decreasing':
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    default:
      return <BarChart2 className="h-4 w-4 text-gray-500" />;
  }
};

interface BiasAlertProps {
  bias: Bias;
  onDismiss: (id: string) => void;
  showTrend?: boolean;
}

function BiasAlert({ bias, onDismiss, showTrend = false }: BiasAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className={`border rounded-lg overflow-hidden ${
        bias.severity === 'high' ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' :
        bias.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10' :
        'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-1 rounded-full ${
              bias.severity === 'high' ? 'text-red-500' :
              bias.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
            }`}>
              {getBiasIcon(bias.severity)}
            </div>
            <div>
              <h4 className="font-medium">{bias.title}</h4>
              <p className="text-sm text-muted-foreground">{bias.description}</p>
              
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-muted/30">
                  <p className="text-sm">
                    <span className="font-medium">Impact:</span> {bias.impact}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Recommendation:</span> {bias.recommendation}
                  </p>
                  
                  {bias.affectedAssets && bias.affectedAssets.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-muted-foreground">Affected Assets:</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {bias.affectedAssets.map(asset => (
                          <Badge key={asset} variant="outline" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {showTrend && bias.trend && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Trend:</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(bias.trend)}
                        <span className="capitalize">{bias.trend}</span>
                        <span className="text-muted-foreground text-xs">
                          ({bias.trendPercentage}% {bias.trend === 'increasing' ? 'increase' : 'decrease'})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onDismiss(bias.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getBiasSeverityColor(bias.severity)}
            >
              {bias.severity.charAt(0).toUpperCase() + bias.severity.slice(1)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {bias.confidence}% confidence
            </div>
          </div>
          
          <Button 
            variant="link" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Learn More'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BiasDetection() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'history'>('overview');
  const [dismissedBiases, setDismissedBiases] = useState<Set<string>>(new Set());
  const [biases, setBiases] = useState<Bias[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBiasData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const now = new Date();
        const mockBiases: Bias[] = Object.entries(biasData).map(([type, data]) => ({
          id: type,
          ...data,
          detectedAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          affectedAssets: generateRandomAssets(),
          trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as 'increasing' | 'decreasing' | 'stable',
          trendPercentage: Math.floor(Math.random() * 30) + 5
        }));
        
        setBiases(mockBiases);
      } catch (error) {
        console.error('Error fetching bias data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBiasData();
  }, []);
  
  const generateRandomAssets = (): string[] => {
    const assets = ['TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NVDA', 'BRK.B', 'JPM', 'V'];
    const count = Math.floor(Math.random() * 3) + 1;
    return assets.sort(() => 0.5 - Math.random()).slice(0, count);
  };
  
  const dismissBias = (biasId: string) => {
    setDismissedBiases(prev => new Set(prev).add(biasId));
  };
  
  const resetDismissedBiases = () => {
    setDismissedBiases(new Set());
  };
  
  const activeBiases = biases.filter(bias => !dismissedBiases.has(bias.id));
  const highSeverityBiases = activeBiases.filter(bias => bias.severity === 'high');
  const mediumSeverityBiases = activeBiases.filter(bias => bias.severity === 'medium');
  const lowSeverityBiases = activeBiases.filter(bias => bias.severity === 'low');
  
  const getSeverityCount = (severity: BiasSeverity) => {
    return biases.filter(bias => bias.severity === severity).length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bias Detection</CardTitle>
          <CardDescription>Analyzing your trading behavior for cognitive biases...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <div className="animate-pulse text-center space-y-2">
            <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analyzing your trading patterns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Bias Detection</CardTitle>
            <CardDescription>
              Identify and mitigate cognitive biases in your trading decisions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetDismissedBiases}
              disabled={dismissedBiases.size === 0}
            >
              Reset Dismissed
            </Button>
            <Button size="sm">
              Run New Analysis
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    High Severity
                  </CardDescription>
                  <CardTitle className="text-2xl">{getSeverityCount('high')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {getSeverityCount('high') > 0 
                      ? 'Needs immediate attention' 
                      : 'No high severity biases detected'}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    Medium Severity
                  </CardDescription>
                  <CardTitle className="text-2xl">{getSeverityCount('medium')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {getSeverityCount('medium') > 0 
                      ? 'Monitor these biases' 
                      : 'No medium severity biases detected'}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Low Severity
                  </CardDescription>
                  <CardTitle className="text-2xl">{getSeverityCount('low')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {getSeverityCount('low') > 0 
                      ? 'Low impact biases' 
                      : 'No low severity biases detected'}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Active Bias Alerts</h3>
                <span className="text-xs text-muted-foreground">
                  {activeBiases.length} active {activeBiases.length === 1 ? 'bias' : 'biases'}
                </span>
              </div>
              
              {activeBiases.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/20">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="font-medium">No active bias alerts</p>
                  <p className="text-sm text-muted-foreground mt-1">Your trading patterns look balanced.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {highSeverityBiases.map(bias => (
                    <BiasAlert 
                      key={bias.id} 
                      bias={bias} 
                      onDismiss={dismissBias} 
                      showTrend
                    />
                  ))}
                  
                  {mediumSeverityBiases.map(bias => (
                    <BiasAlert 
                      key={bias.id} 
                      bias={bias} 
                      onDismiss={dismissBias} 
                      showTrend
                    />
                  ))}
                  
                  {lowSeverityBiases.map(bias => (
                    <BiasAlert 
                      key={bias.id} 
                      bias={bias} 
                      onDismiss={dismissBias} 
                      showTrend
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analysis" className="mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Bias Distribution</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">By Severity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {['high', 'medium', 'low'].map(severity => {
                        const count = biases.filter(b => b.severity === severity).length;
                        const percentage = (count / biases.length) * 100;
                        
                        return (
                          <div key={severity} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm capitalize">{severity} Severity</span>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div 
                                className={`h-full ${
                                  severity === 'high' ? 'bg-red-500' :
                                  severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{
                                  width: `${percentage}%`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">By Type</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(biasData).map(([type, data]) => {
                        const count = biases.filter(b => b.type === type).length;
                        const percentage = (count / biases.length) * 100;
                        
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm capitalize">
                                {type.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div 
                                className={`h-full ${
                                  data.severity === 'high' ? 'bg-red-500' :
                                  data.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{
                                  width: `${percentage}%`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Detailed Analysis</h3>
                <div className="space-y-4">
                  {Object.entries(biasData).map(([type, data]) => {
                    const biasInstances = biases.filter(b => b.type === type);
                    const lastInstance = biasInstances[0];
                    
                    return (
                      <Card key={type} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{data.title}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={getBiasSeverityColor(data.severity)}
                                >
                                  {data.severity.charAt(0).toUpperCase() + data.severity.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {data.description}
                              </p>
                              
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center text-sm">
                                  <span className="w-24 text-muted-foreground">Impact:</span>
                                  <span>{data.impact}</span>
                                </div>
                                <div className="flex items-start text-sm">
                                  <span className="w-24 text-muted-foreground">Recommendation:</span>
                                  <span>{data.recommendation}</span>
                                </div>
                                
                                {lastInstance?.affectedAssets && lastInstance.affectedAssets.length > 0 && (
                                  <div className="flex items-center text-sm">
                                    <span className="w-24 text-muted-foreground">Affected Assets:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {lastInstance.affectedAssets.map(asset => (
                                        <Badge key={asset} variant="outline" className="text-xs">
                                          {asset}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {lastInstance?.trend && (
                                  <div className="flex items-center text-sm">
                                    <span className="w-24 text-muted-foreground">Trend:</span>
                                    <div className="flex items-center gap-1">
                                      {getTrendIcon(lastInstance.trend)}
                                      <span className="capitalize">{lastInstance.trend}</span>
                                      <span className="text-muted-foreground text-xs">
                                        ({lastInstance.trendPercentage}% {lastInstance.trend === 'increasing' ? 'increase' : 'decrease'})
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {biasInstances.length} {biasInstances.length === 1 ? 'occurrence' : 'occurrences'}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => dismissBias(type)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Last detected: {lastInstance?.detectedAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Bias Detection History</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Export Data</Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Bias Type</th>
                        <th className="text-left p-3 font-medium">Severity</th>
                        <th className="text-left p-3 font-medium">Confidence</th>
                        <th className="text-left p-3 font-medium">Affected Assets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...biases]
                        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
                        .map((bias, index) => (
                          <tr key={`${bias.id}-${index}`} className="hover:bg-muted/50">
                            <td className="p-3">
                              {bias.detectedAt.toLocaleDateString()}
                              <div className="text-xs text-muted-foreground">
                                {bias.detectedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </td>
                            <td className="p-3 capitalize">
                              {bias.type.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  bias.severity === 'high' ? 'bg-red-500' :
                                  bias.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                                <span className="capitalize">{bias.severity}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="relative h-2 w-20 overflow-hidden rounded-full bg-muted">
                                  <div 
                                    className={`h-full ${
                                      bias.severity === 'high' ? 'bg-red-500' :
                                      bias.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{
                                      width: `${bias.confidence}%`
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-mono">{bias.confidence}%</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap max-w-[200px]">
                                {bias.affectedAssets?.map(asset => (
                                  <Badge key={asset} variant="outline" className="text-xs">
                                    {asset}
                                  </Badge>
                                )) || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>Bias detection is based on your trading patterns and may not capture all cognitive biases.</p>
          <p>Last analyzed: {new Date().toLocaleString()}</p>
        </div>
      </CardFooter>
    </Card>
  );
}
