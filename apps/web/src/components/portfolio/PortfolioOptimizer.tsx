'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from '@/components/ui/select';
import { 
  Slider 
} from '@/components/ui/slider';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Legend,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceLine,
  Label,
  Cell,
  PieChart,
  Pie,
  Sector,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Target, 
  Zap, 
  Info, 
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  ArrowUpDown,
  Leaf,
  Users,
  Shield,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Types
type Asset = {
  ticker: string;
  name: string;
  weight: number;
  expectedReturn: number;
  volatility: number;
  sector: string;
  esgScore?: number;
  factorExposures?: {
    market: number;
    size: number;
    value: number;
    profitability: number;
    investment: number;
  };
  aiThesis?: {
    summary: string;
    strengths: string[];
    risks: string[];
    lastUpdated: string;
  };
};

type OptimizedPortfolio = {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  esgScore: number;
};

type OptimizationMethod = 'mpt' | 'risk-parity' | 'black-litterman';

type MarketView = {
  id: string;
  description: string;
  assets: string[];
  viewReturn: number; // Expected return for the view
  confidence: number; // 0-100, higher means more confidence
  type: 'absolute' | 'relative'; // Absolute return or relative to market
};

type TaxLot = {
  id: string;
  ticker: string;
  purchaseDate: string;
  purchasePrice: number;
  quantity: number;
  currentPrice: number;
  isWashSale: boolean;
  daysHeld: number;
};

type FactorExposure = {
  name: string;
  value: number;
  description: string;
  idealRange: [number, number];
};

// Mock data for demonstration
const mockAssets: Asset[] = [
  { 
    ticker: 'VTI', 
    name: 'Vanguard Total Stock Market', 
    weight: 0, 
    expectedReturn: 0.08, 
    volatility: 0.15, 
    sector: 'Equity',
    esgScore: 75,
    factorExposures: {
      market: 1.0,
      size: 0.1,
      value: 0.2,
      profitability: 0.8,
      investment: 0.3
    },
    aiThesis: {
      summary: "Broad market exposure with low cost and strong liquidity. Ideal for core portfolio allocation.",
      strengths: [
        "Diversified exposure to the entire US equity market",
        "Low expense ratio (0.03%)",
        "High liquidity with tight bid-ask spreads"
      ],
      risks: [
        "Market risk exposure",
        "Limited exposure to international markets"
      ],
      lastUpdated: '2025-09-01'
    }
  },
  { 
    ticker: 'VXUS', 
    name: 'Vanguard Total International Stock', 
    weight: 0, 
    expectedReturn: 0.09, 
    volatility: 0.18, 
    sector: 'International',
    esgScore: 82,
    factorExposures: {
      market: 0.9,
      size: 0.3,
      value: 0.4,
      profitability: 0.7,
      investment: 0.2
    },
    aiThesis: {
      summary: "Diversified international exposure with a tilt towards developed markets.",
      strengths: [
        "Exposure to developed and emerging markets",
        "Currency diversification benefits",
        "Attractive valuation relative to US markets"
      ],
      risks: [
        "Currency risk",
        "Political and regulatory risks in emerging markets"
      ],
      lastUpdated: '2025-09-01'
    }
  },
  { 
    ticker: 'BND', 
    name: 'Vanguard Total Bond Market', 
    weight: 0, 
    expectedReturn: 0.03, 
    volatility: 0.04, 
    sector: 'Bonds',
    esgScore: 68,
    factorExposures: {
      market: 0.2,
      size: -0.1,
      value: 0.3,
      profitability: 0.1,
      investment: -0.2
    },
    aiThesis: {
      summary: "High-quality bond exposure for income and risk reduction.",
      strengths: [
        "Portfolio diversification",
        "Stable income stream",
        "Lower volatility than equities"
      ],
      risks: [
        "Interest rate risk",
        "Inflation risk"
      ],
      lastUpdated: '2025-09-01'
    }
  },
  { 
    ticker: 'QQQ', 
    name: 'Invesco QQQ Trust', 
    weight: 0, 
    expectedReturn: 0.12, 
    volatility: 0.22, 
    sector: 'Technology',
    esgScore: 65,
    factorExposures: {
      market: 1.2,
      size: 0.4,
      value: -0.3,
      profitability: 1.1,
      investment: 0.8
    },
    aiThesis: {
      summary: "Growth-oriented exposure to leading tech and innovation companies.",
      strengths: [
        "Exposure to innovative growth companies",
        "Strong historical performance",
        "Liquidity and low expense ratio"
      ],
      risks: [
        "Concentration in tech sector",
        "Higher valuation multiples"
      ],
      lastUpdated: '2025-09-01'
    }
  },
  { 
    ticker: 'ESGV', 
    name: 'Vanguard ESG U.S. Stock ETF', 
    weight: 0, 
    expectedReturn: 0.085, 
    volatility: 0.16, 
    sector: 'ESG',
    esgScore: 92,
    factorExposures: {
      market: 0.95,
      size: 0.2,
      value: 0.3,
      profitability: 0.7,
      investment: 0.4
    },
    aiThesis: {
      summary: "ESG-focused US equity exposure with strong sustainability credentials.",
      strengths: [
        "ESG screening for positive impact",
        "Competitive returns with lower carbon footprint",
        "Diversified across sectors"
      ],
      risks: [
        "Sector tilts due to ESG exclusions",
        "Slightly higher expense ratio than non-ESG counterparts"
      ],
      lastUpdated: '2025-09-01'
    }
  },
];

// Correlation matrix (simplified for demo)
const correlationMatrix: Record<string, Record<string, number>> = {
  'VTI': { 'VTI': 1.0, 'VXUS': 0.75, 'BND': -0.2, 'QQQ': 0.85, 'ESGV': 0.95 },
  'VXUS': { 'VTI': 0.75, 'VXUS': 1.0, 'BND': -0.1, 'QQQ': 0.6, 'ESGV': 0.7 },
  'BND': { 'VTI': -0.2, 'VXUS': -0.1, 'BND': 1.0, 'QQQ': -0.15, 'ESGV': -0.1 },
  'QQQ': { 'VTI': 0.85, 'VXUS': 0.6, 'BND': -0.15, 'QQQ': 1.0, 'ESGV': 0.8 },
  'ESGV': { 'VTI': 0.95, 'VXUS': 0.7, 'BND': -0.1, 'QQQ': 0.8, 'ESGV': 1.0 },
};

// Risk-free rate (10-year Treasury yield)
const RISK_FREE_RATE = 0.04;

// Helper functions for portfolio optimization
const calculatePortfolioReturn = (assets: Asset[], weights: Record<string, number>): number => {
  return assets.reduce((sum, asset) => sum + (asset.expectedReturn * (weights[asset.ticker] || 0)), 0);
};

const calculatePortfolioVolatility = (assets: Asset[], weights: Record<string, number>): number => {
  let variance = 0;
  
  assets.forEach(asset1 => {
    assets.forEach(asset2 => {
      const weight1 = weights[asset1.ticker] || 0;
      const weight2 = weights[asset2.ticker] || 0;
      const corr = correlationMatrix[asset1.ticker]?.[asset2.ticker] || 0;
      
      variance += weight1 * weight2 * asset1.volatility * asset2.volatility * corr;
    });
  });
  
  return Math.sqrt(variance);
};

const calculateSharpeRatio = (expectedReturn: number, volatility: number): number => {
  return volatility > 0 ? (expectedReturn - RISK_FREE_RATE) / volatility : 0;
};

const calculateESGScore = (assets: Asset[], weights: Record<string, number>): number => {
  let totalScore = 0;
  let totalWeight = 0;
  
  assets.forEach(asset => {
    const weight = weights[asset.ticker] || 0;
    totalScore += (asset.esgScore || 50) * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
};

// Calculate covariance matrix
const calculateCovarianceMatrix = (assets: Asset[]): number[][] => {
  const n = assets.length;
  const covMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const corr = correlationMatrix[assets[i].ticker]?.[assets[j].ticker] || 0;
      covMatrix[i][j] = corr * assets[i].volatility * assets[j].volatility;
    }
  }
  
  return covMatrix;
};

// Black-Litterman model implementation
const optimizePortfolioBlackLitterman = (assets: Asset[], views: MarketView[]): OptimizedPortfolio => {
  // 1. Calculate market equilibrium returns (reverse optimization)
  const covMatrix = calculateCovarianceMatrix(assets);
  const riskAversion = 2.5; // Typical value for risk aversion coefficient
  const marketCapWeights = assets.map(asset => 1 / assets.length); // Equal weights as market proxy
  
  // Equilibrium excess returns: Π = λ * Σ * w_mkt
  const equilibriumReturns = covMatrix.map((row, i) => 
    riskAversion * row.reduce((sum, cov, j) => sum + cov * marketCapWeights[j], 0)
  );
  
  // 2. Process views
  if (views.length > 0) {
    // For simplicity, we'll implement a basic version with one view
    // In a full implementation, you would create the P, Q, and Ω matrices
    const view = views[0]; // Using the first view for demonstration
    const assetIndex = assets.findIndex(a => a.ticker === view.assets[0]);
    
    if (assetIndex !== -1) {
      // Adjust the expected return based on the view
      // This is a simplified approach - full BL would use the complete formula
      const confidence = view.confidence / 100;
      equilibriumReturns[assetIndex] = 
        (1 - confidence) * equilibriumReturns[assetIndex] + 
        confidence * view.viewReturn;
    }
  }
  
  // 3. Optimize with adjusted returns (using MPT with adjusted returns)
  return optimizeWithTargetReturn(assets, equilibriumReturns, covMatrix);
};

// Helper function for optimization with target return
const optimizeWithTargetReturn = (
  assets: Asset[], 
  expectedReturns: number[],
  covMatrix: number[][],
  targetReturn?: number
): OptimizedPortfolio => {
  // This is a simplified optimization - in practice, you'd use a proper solver
  const n = assets.length;
  const weights = new Array(n).fill(0);
  
  // Simple heuristic: allocate more to higher Sharpe ratio assets
  const sharpeRatios = assets.map((asset, i) => ({
    index: i,
    sharpe: (expectedReturns[i] - RISK_FREE_RATE) / assets[i].volatility
  })).sort((a, b) => b.sharpe - a.sharpe);
  
  let remainingWeight = 1;
  for (let i = 0; i < n - 1; i++) {
    const idx = sharpeRatios[i].index;
    const weight = (1 / (i + 1)) * 0.6 * remainingWeight;
    weights[idx] = weight;
    remainingWeight -= weight;
  }
  weights[sharpeRatios[n-1].index] = remainingWeight;
  
  // Convert weights to record
  const weightsRecord: Record<string, number> = {};
  assets.forEach((asset, i) => {
    weightsRecord[asset.ticker] = weights[i];
  });
  
  // Calculate portfolio metrics
  const expectedReturn = calculatePortfolioReturn(assets, weightsRecord);
  const volatility = calculatePortfolioVolatility(assets, weightsRecord);
  const sharpeRatio = calculateSharpeRatio(expectedReturn, volatility);
  const esgScore = calculateESGScore(assets, weightsRecord);
  
  return { weights: weightsRecord, expectedReturn, volatility, sharpeRatio, esgScore };
};

// Optimization functions
const optimizePortfolioMPT = (assets: Asset[], targetReturn?: number): OptimizedPortfolio => {
  // For demo purposes, we'll use a simplified optimization
  // In a real-world scenario, you would use a proper optimization library
  
  // Sort assets by Sharpe ratio (simplified)
  const sortedAssets = [...assets].sort(
    (a, b) => calculateSharpeRatio(b.expectedReturn, b.volatility) - calculateSharpeRatio(a.expectedReturn, a.volatility)
  );
  
  // Simple allocation strategy (for demo)
  const weights: Record<string, number> = {};
  let remainingWeight = 1;
  
  // Allocate more to assets with better risk-adjusted returns
  sortedAssets.forEach((asset, index) => {
    if (index < sortedAssets.length - 1) {
      const weight = (1 / (index + 1)) * 0.6 * remainingWeight;
      weights[asset.ticker] = weight;
      remainingWeight -= weight;
    } else {
      weights[asset.ticker] = remainingWeight;
    }
  });
  
  // Calculate portfolio metrics
  const expectedReturn = calculatePortfolioReturn(assets, weights);
  const volatility = calculatePortfolioVolatility(assets, weights);
  const sharpeRatio = calculateSharpeRatio(expectedReturn, volatility);
  const esgScore = calculateESGScore(assets, weights);
  
  return { weights, expectedReturn, volatility, sharpeRatio, esgScore };
};

const optimizePortfolioRiskParity = (assets: Asset[]): OptimizedPortfolio => {
  // Risk parity allocation (simplified)
  const weights: Record<string, number> = {};
  
  // Calculate inverse volatility weights
  let totalInverseVol = 0;
  assets.forEach(asset => {
    totalInverseVol += 1 / asset.volatility;
  });
  
  assets.forEach(asset => {
    weights[asset.ticker] = (1 / asset.volatility) / totalInverseVol;
  });
  
  // Calculate portfolio metrics
  const expectedReturn = calculatePortfolioReturn(assets, weights);
  const volatility = calculatePortfolioVolatility(assets, weights);
  const sharpeRatio = calculateSharpeRatio(expectedReturn, volatility);
  const esgScore = calculateESGScore(assets, weights);

// Component
export function PortfolioOptimizer() {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [optimizationMethod, setOptimizationMethod] = useState<OptimizationMethod>('mpt');
  const [targetReturn, setTargetReturn] = useState<number>(0.08);
  const [optimizedPortfolio, setOptimizedPortfolio] = useState<OptimizedPortfolio | null>(null);
  const [activeTab, setActiveTab] = useState('optimization');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Black-Litterman model state
  const [marketViews, setMarketViews] = useState<MarketView[]>([
    {
      id: 'view1',
      description: 'Technology sector will outperform by 3%',
      assets: ['QQQ'],
      viewReturn: 0.03,
      confidence: 70,
      type: 'relative'
    },
    {
      id: 'view2',
      description: 'ESG assets will return 2% more than market',
      assets: ['ESGV'],
      viewReturn: 0.02,
      confidence: 80,
      type: 'relative'
    }
  ]);

  // Tax-lot data
  const [taxLots, setTaxLots] = useState<Record<string, TaxLot[]>>({
    'VTI': [
      {
        id: 'lot1',
        ticker: 'VTI',
        purchaseDate: '2024-01-15',
        purchasePrice: 220.50,
        quantity: 10,
        currentPrice: 245.30,
        isWashSale: false,
        daysHeld: 240
      },
      {
        id: 'lot2',
        ticker: 'VTI',
        purchaseDate: '2024-06-01',
        purchasePrice: 235.75,
        quantity: 15,
        currentPrice: 245.30,
        isWashSale: false,
        daysHeld: 100
      }
    ],
    'QQQ': [
      {
        id: 'lot3',
        ticker: 'QQQ',
        purchaseDate: '2023-11-01',
        purchasePrice: 350.20,
        quantity: 5,
        currentPrice: 420.50,
        isWashSale: false,
        daysHeld: 320
      }
    ]
  });

  const [taxHarvestingEnabled, setTaxHarvestingEnabled] = useState<boolean>(true);
  const [taxRate, setTaxRate] = useState<number>(0.15); // Default long-term capital gains rate

  // Calculate initial portfolio metrics
  const initialWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    const equalWeight = 1 / assets.length;
    assets.forEach(asset => {
      weights[asset.ticker] = equalWeight;
    });
    return weights;
  }, [assets]);

  // Calculate tax implications of selling specific lots
  const calculateTaxImpact = (ticker: string, quantity: number): { taxOwed: number; lotsToSell: TaxLot[] } => {
    const lots = [...(taxLots[ticker] || [])].sort((a, b) => {
      // Sort by tax efficiency: highest cost basis first to minimize gains
      if (taxHarvestingEnabled) {
        // For tax loss harvesting, we want to sell losers first
        const aGain = (a.currentPrice - a.purchasePrice) * a.quantity;
        const bGain = (b.currentPrice - b.purchasePrice) * b.quantity;
        return aGain - bGain; // Sell biggest losers first
      } else {
        // For normal selling, sell highest cost basis first (minimize gains)
        return b.purchasePrice - a.purchasePrice;
      }
    });

    let remainingQty = quantity;
    const lotsToSell: TaxLot[] = [];
    let totalTax = 0;

    for (const lot of lots) {
      if (remainingQty <= 0) break;

      const qtyToSell = Math.min(remainingQty, lot.quantity);
      const gain = (lot.currentPrice - lot.purchasePrice) * qtyToSell;

      // Skip wash sales if harvesting losses
      if (taxHarvestingEnabled && gain < 0 && lot.isWashSale) {
        continue;
      }
    };
    
    return Object.entries(factors).map(([name, { sum }]) => ({
      name,
      value: parseFloat(sum.toFixed(2)),
      description: factorDescriptions[name]?.description || '',
      idealRange: factorDescriptions[name]?.idealRange || [0, 1]
    }));
  };
  
  // Calculate current and optimized factor exposures
  const currentFactorExposures = useMemo(
    () => calculateFactorExposures(initialWeights), 
    [assets, initialWeights]
  );
  
  const optimizedFactorExposures = useMemo(
    () => optimizedPortfolio ? calculateFactorExposures(optimizedPortfolio.weights) : [],
    [optimizedPortfolio]
  );
  
  // Render factor exposure bar
  const renderFactorBar = (factor: FactorExposure, isOptimized = false) => {
    const isInRange = factor.value >= factor.idealRange[0] && factor.value <= factor.idealRange[1];
    const isBelowRange = factor.value < factor.idealRange[0];
    const rangeWidth = factor.idealRange[1] - factor.idealRange[0];
    const rangeStartPercent = ((factor.idealRange[0] + 1) / 2) * 100;
    const rangeWidthPercent = (rangeWidth / 2) * 100;
    
    return (
      <div key={factor.name} className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="capitalize font-medium">{factor.name}</span>
          <span className={`font-mono ${isInRange ? 'text-green-500' : isBelowRange ? 'text-blue-500' : 'text-orange-500'}`}>
            {factor.value.toFixed(2)}
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-blue-500"
            style={{
              left: '50%',
              width: `${factor.value * 100}%`,
              transform: 'translateX(-50%)',
              transition: 'width 0.3s ease-in-out'
            }}
          />
          <div 
            className="absolute h-full bg-green-500/30"
            style={{
              left: `${rangeStartPercent}%`,
              width: `${rangeWidthPercent}%`,
              transition: 'all 0.3s ease-in-out'
            }}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {factor.description}
        </div>
      </div>
    );
  };
  
  // Render asset allocation chart
  const renderAllocationChart = (weights: Record<string, number>, title: string) => {
    const data = assets.map(asset => ({
      name: asset.ticker,
      value: parseFloat(((weights[asset.ticker] || 0) * 100).toFixed(1)),
      sector: asset.sector,
      color: getSectorColor(asset.sector)
    })).filter(item => item.value > 0);
    
    return (
      <div className="h-64">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => 
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value: number) => [`${value}%`, 'Allocation']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  // Get color based on sector
  const getSectorColor = (sector: string): string => {
    const colors: Record<string, string> = {
      'Equity': '#3b82f6',
      'International': '#10b981',
      'Bonds': '#f59e0b',
      'Technology': '#8b5cf6',
      'ESG': '#06b6d4',
      'Real Estate': '#ec4899',
      'Commodities': '#ef4444'
    };
    
    return colors[sector] || '#9ca3af';
  };
  
  // Render AI thesis for an asset
  const renderAIThesis = (asset: Asset) => {
    if (!asset.aiThesis) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium">AI Investment Thesis</h3>
          <Badge variant="outline" className="ml-auto">
            Updated: {asset.aiThesis.lastUpdated}
          </Badge>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm">{asset.aiThesis.summary}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-500">
              <TrendingUp className="w-4 h-4" />
              <h4 className="text-sm font-medium">Strengths</h4>
            </div>
            <ul className="space-y-1 text-sm">
              {asset.aiThesis.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <TrendingDown className="w-4 h-4" />
              <h4 className="text-sm font-medium">Risks</h4>
            </div>
            <ul className="space-y-1 text-sm">
              {asset.aiThesis.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };
  
  // Render ESG score with breakdown
  const renderESGScore = (score: number) => {
    const getESGColor = (score: number) => {
      if (score >= 80) return 'bg-green-500';
      if (score >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    };
    
    const getESGLabel = (score: number) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Average';
      if (score >= 20) return 'Poor';
      return 'Very Poor';
    };
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">ESG Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getESGColor(score).replace('bg-', 'text-')}`}>
              {score.toFixed(0)}
            </span>
            <Badge variant="outline" className={getESGColor(score).replace('bg-', 'bg-').replace('500', '500/20')}>
              {getESGLabel(score)}
            </Badge>
          </div>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${getESGColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="space-y-1">
            <div className="w-8 h-8 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-blue-500" />
            </div>
            <div>Environmental</div>
            <div className="font-medium">
              {Math.min(100, Math.round(score * 1.1))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-green-500" />
            </div>
            <div>Social</div>
            <div className="font-medium">
              {Math.min(100, Math.round(score * 0.95))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-8 h-8 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-500" />
            </div>
            <div>Governance</div>
            <div className="font-medium">
              {Math.min(100, Math.round(score * 0.9))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render optimization result metrics
  const renderMetrics = (portfolio: OptimizedPortfolio, title: string) => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">{title}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expected Return</CardDescription>
            <CardTitle className="text-xl">
              {(portfolio.expectedReturn * 100).toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volatility</CardDescription>
            <CardTitle className="text-xl">
              {(portfolio.volatility * 100).toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sharpe Ratio</CardDescription>
            <CardTitle className="text-xl">
              {portfolio.sharpeRatio.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ESG Score</CardDescription>
            <CardTitle className="text-xl">
              {portfolio.esgScore.toFixed(0)}
              <span className="text-xs text-muted-foreground ml-1">/100</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {renderESGScore(portfolio.esgScore)}
    </div>
  );
  
  // Render factor analysis
  const renderFactorAnalysis = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Factor Exposures</h3>
        <p className="text-sm text-muted-foreground">
          Analysis of your portfolio's exposure to different risk factors
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentFactorExposures.map(factor => renderFactorBar(factor))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle className="text-sm font-medium">Optimized Portfolio</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI-Optimized
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            {optimizedFactorExposures.map(factor => renderFactorBar(factor, true))}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Factor Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Ideal Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentFactorExposures.map((factor, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium capitalize">{factor.name}</TableCell>
                  <TableCell className="text-sm">{factor.description}</TableCell>
                  <TableCell className="text-sm">
                    {factor.idealRange[0]} to {factor.idealRange[1]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render Black-Litterman views
  const renderBlackLittermanViews = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Market Views</h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            const newView: MarketView = {
              id: `view-${Date.now()}`,
              description: 'New market view',
              assets: [],
              viewReturn: 0.02,
              confidence: 50,
              type: 'relative'
            };
            setMarketViews([...marketViews, newView]);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add View
        </Button>
      </div>
      
      <div className="space-y-3">
        {marketViews.map((view, index) => (
          <div key={view.id} className="p-3 border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium">{view.description}</div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => {
                  setMarketViews(marketViews.filter((_, i) => i !== index));
                }}
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Type</div>
                <Select
                  value={view.type}
                  onValueChange={(value) => {
                    const newViews = [...marketViews];
                    newViews[index].type = value as 'absolute' | 'relative';
                    setMarketViews(newViews);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relative">Relative to Market</SelectItem>
                    <SelectItem value="absolute">Absolute Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Return</div>
                <div className="flex items-center">
                  <Input
                    type="number"
                    value={view.viewReturn * 100}
                    onChange={(e) => {
                      const newViews = [...marketViews];
                      newViews[index].viewReturn = (parseFloat(e.target.value) || 0) / 100;
                      setMarketViews(newViews);
                    }}
                    className="h-8"
                    step={0.1}
                  />
                  <span className="ml-1 text-sm">%</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Confidence</div>
                <Slider
                  value={[view.confidence]}
                  onValueChange={([value]) => {
                    const newViews = [...marketViews];
                    newViews[index].confidence = value;
                    setMarketViews(newViews);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="py-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {view.confidence}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render tax loss harvesting opportunities
  const renderTaxLossHarvesting = () => {
    const opportunities = findTaxLossHarvestingOpportunities();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Tax Loss Harvesting</h4>
            <p className="text-xs text-muted-foreground">
              Potential tax savings by realizing losses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tax Rate:</span>
            <div className="w-20">
              <Input
                type="number"
                value={taxRate * 100}
                onChange={(e) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                className="h-8 text-right"
                min={0}
                max={100}
                step={0.1}
              />
            </div>
            <span className="text-xs">%</span>
          </div>
        </div>
        
        {opportunities.length > 0 ? (
          <div className="space-y-3">
            {opportunities.map((opp, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Sell {opp.ticker}</div>
                    <div className="text-sm text-muted-foreground">
                      Potential tax savings: ${(opp.loss * taxRate).toFixed(2)}
                    </div>
                  </div>
                  {opp.replacement && (
                    <div className="text-sm text-muted-foreground">
                      Replace with: <span className="font-medium">{opp.replacement}</span>
                    </div>
                  )}
                  <Button size="sm">
                    Harvest
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No tax loss harvesting opportunities found.
          </div>
        )}
        
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Tax-loss harvesting is {taxHarvestingEnabled ? 'enabled' : 'disabled'}</span>
          </div>
          <Button 
            variant={taxHarvestingEnabled ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTaxHarvestingEnabled(!taxHarvestingEnabled)}
          >
            {taxHarvestingEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>
    );
  };
  
  // Render optimization controls
  const renderOptimizationControls = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Optimization Method</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p>Select the optimization method based on your investment objectives and risk tolerance.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Select 
          value={optimizationMethod}
          onValueChange={(value) => setOptimizationMethod(value as OptimizationMethod)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select optimization method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mpt">Modern Portfolio Theory (MPT)</SelectItem>
            <SelectItem value="risk-parity">Risk Parity</SelectItem>
            <SelectItem value="black-litterman" disabled>Black-Litterman (Coming Soon)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Target Return: {(targetReturn * 100).toFixed(1)}%</label>
          <span className="text-xs text-muted-foreground">
            {targetReturn < 0.05 ? 'Conservative' : targetReturn < 0.1 ? 'Moderate' : 'Aggressive'}
          </span>
        </div>
        <Slider
          value={[targetReturn * 100]}
          onValueChange={([value]) => setTargetReturn(value / 100)}
          min={1}
          max={20}
          step={0.5}
          className="py-4"
        />
      </div>
      
      {optimizationMethod === 'mpt' && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="font-medium">Modern Portfolio Theory</p>
              <p className="text-muted-foreground text-xs">
                Maximizes return for a given level of risk by finding the optimal asset allocation.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {optimizationMethod === 'risk-parity' && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium">Risk Parity</p>
              <p className="text-muted-foreground text-xs">
                Allocates risk equally across asset classes rather than capital, often leading to better risk-adjusted returns.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {optimizationMethod === 'black-litterman' && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
            <div>
              <p className="font-medium">Black-Litterman Model</p>
              <p className="text-muted-foreground text-xs">
                Combines market equilibrium with your views to generate expected returns that reflect both market consensus and your insights.
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            {renderBlackLittermanViews()}
          </div>
        </div>
      )}
    </div>
  );
  
  // Render asset allocation and weights
  const renderAssetAllocation = () => {
    if (!optimizedPortfolio) return null;
    
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Asset Allocation</h3>
          <p className="text-sm text-muted-foreground">
            Adjust weights manually or let the optimizer determine the optimal allocation
          </p>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Optimized</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => {
              const currentWeight = (initialWeights[asset.ticker] || 0) * 100;
              const optimizedWeight = (optimizedPortfolio.weights[asset.ticker] || 0) * 100;
              const difference = optimizedWeight - currentWeight;
              
              return (
                <TableRow 
                  key={asset.ticker}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getSectorColor(asset.sector) }}
                      />
                      <div>
                        <div className="font-medium">{asset.ticker}</div>
                        <div className="text-xs text-muted-foreground">{asset.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <Input 
                          type="number" 
                          value={currentWeight.toFixed(1)}
                          onChange={(e) => 
                            handleWeightChange(asset.ticker, parseFloat(e.target.value) || 0)
                          }
                          min={0}
                          max={100}
                          step={0.1}
                          className="h-8 w-full"
                        />
                      </div>
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-16 text-right">
                        {optimizedWeight.toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center ${difference > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {difference > 0 ? (
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(difference).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWeightChange(asset.ticker, optimizedWeight);
                      }}
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAllocationChart(initialWeights, 'Current Allocation')}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-sm font-medium">Optimized Allocation</CardTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Optimized
              </Badge>
            </CardHeader>
            <CardContent>
              {renderAllocationChart(optimizedPortfolio.weights, 'Optimized Allocation')}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
  
  // Render the main component
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Portfolio Optimizer</h2>
          <p className="text-muted-foreground">
            Advanced portfolio optimization using Modern Portfolio Theory and AI
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rebalance
          </Button>
          <Button size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="optimization">Portfolio Optimization</TabsTrigger>
          <TabsTrigger value="factor">Factor Analysis</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {renderAssetAllocation()}
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Optimization Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderOptimizationControls()}
                </CardContent>
              </Card>
              
              {optimizationMethod === 'black-litterman' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Market Views</CardTitle>
                    <CardDescription>
                      Add your market views to influence the optimization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderBlackLittermanViews()}
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Tax Optimization</CardTitle>
                  <CardDescription>
                    Tax-loss harvesting and capital gains management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderTaxLossHarvesting()}
                </CardContent>
              </Card>
              
              {optimizedPortfolio && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Optimized Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderMetrics(optimizedPortfolio, 'Optimized Portfolio')}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="factor">
          {renderFactorAnalysis()}
        </TabsContent>
        
        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">AI-Generated Investment Theses</CardTitle>
                  <CardDescription>
                    AI-powered analysis of each asset in your portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {assets.map((asset, i) => (
                      <div key={i} className="space-y-4">
                        <div 
                          className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: getSectorColor(asset.sector) }}
                          >
                            {asset.ticker}
                          </div>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {asset.sector} • {(initialWeights[asset.ticker] * 100).toFixed(1)}% allocation
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsset(asset);
                            }}
                          >
                            View Analysis
                          </Button>
                        </div>
                        
                        {selectedAsset?.ticker === asset.ticker && (
                          <div className="pl-2 border-l-2 border-muted-foreground/20">
                            {renderAIThesis(asset)}
                          </div>
                        )}
                        
                        {i < assets.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Portfolio Recommendations</CardTitle>
                  <CardDescription>
                    AI-powered suggestions to improve your portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Lightbulb className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Increase International Exposure</h4>
                          <p className="text-sm text-muted-foreground">
                            Consider increasing your allocation to international equities (VXUS) to improve 
                            diversification and capture growth in global markets. The optimizer suggests 
                            increasing from {(initialWeights['VXUS'] * 100).toFixed(1)}% to 
                            {optimizedPortfolio ? ` ${(optimizedPortfolio.weights['VXUS'] * 100).toFixed(1)}%` : ' a higher allocation'}.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Leaf className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Enhance ESG Profile</h4>
                          <p className="text-sm text-muted-foreground">
                            Your portfolio's ESG score is {initialPortfolio.esgScore.toFixed(0)}. Consider adding 
                            ESGV to improve your portfolio's sustainability profile while maintaining 
                            competitive returns.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Zap className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Rebalancing Opportunity</h4>
                          <p className="text-sm text-muted-foreground">
                            Your portfolio has drifted from its target allocation. Click "Rebalance" to 
                            automatically adjust your holdings to the optimized allocation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Diversification</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        Good
                      </Badge>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Your portfolio is well-diversified across {new Set(assets.map(a => a.sector)).size} sectors.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Level</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                        Moderate
                      </Badge>
                    </div>
                    <Progress value={60} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Your portfolio's risk level is in line with a moderate risk profile.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cost Efficiency</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        Excellent
                      </Badge>
                    </div>
                    <Progress value={90} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Your portfolio has a low average expense ratio of 0.05%.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tax Efficiency</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                        Good
                      </Badge>
                    </div>
                    <Progress value={80} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Consider tax-loss harvesting opportunities to improve after-tax returns.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Performance Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { year: 'Now', current: 10000, optimized: 10000 },
                          { year: '1Y', current: 10800, optimized: 11000 },
                          { year: '3Y', current: 12597, optimized: 13310 },
                          { year: '5Y', current: 14693, optimized: 16105 },
                          { year: '10Y', current: 21589, optimized: 25937 },
                        ]}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 12 }}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                          labelFormatter={(label) => `Year: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="current" 
                          name="Current" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.1}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="optimized" 
                          name="Optimized" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          fillOpacity={0.1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Projected growth of $10,000 initial investment
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedAsset.ticker}</h2>
                  <p className="text-muted-foreground">{selectedAsset.name}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedAsset(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Sector</div>
                  <div className="font-medium">{selectedAsset.sector}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Allocation</div>
                  <div className="font-medium">
                    {((initialWeights[selectedAsset.ticker] || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Expected Return</div>
                  <div className="font-medium">
                    {(selectedAsset.expectedReturn * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Volatility</div>
                  <div className="font-medium">
                    {(selectedAsset.volatility * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {selectedAsset.esgScore !== undefined && (
                <div>
                  <h3 className="font-medium mb-2">ESG Score</h3>
                  {renderESGScore(selectedAsset.esgScore)}
                </div>
              )}
              
              {selectedAsset.factorExposures && (
                <div>
                  <h3 className="font-medium mb-2">Factor Exposures</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedAsset.factorExposures).map(([factor, value]) => (
                      <div key={factor} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{factor}</span>
                          <span className="font-mono">{value.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{
                              width: `${((value + 1) / 2) * 100}%`,
                              transition: 'width 0.3s ease-in-out'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedAsset.aiThesis && (
                <div>
                  <h3 className="font-medium mb-2">AI Investment Thesis</h3>
                  {renderAIThesis(selectedAsset)}
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const optimizedWeight = optimizedPortfolio 
                      ? (optimizedPortfolio.weights[selectedAsset.ticker] * 100).toFixed(1)
                      : '0';
                    handleWeightChange(selectedAsset.ticker, parseFloat(optimizedWeight));
                    setSelectedAsset(null);
                  }}
                >
                  Apply Optimized Weight ({optimizedPortfolio ? (optimizedPortfolio.weights[selectedAsset.ticker] * 100).toFixed(1) : '0'}%)
                </Button>
                <Button 
                  onClick={() => setSelectedAsset(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortfolioOptimizer;
