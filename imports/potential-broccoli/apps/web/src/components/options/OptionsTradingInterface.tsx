'use client';

import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Info, 
  AlertTriangle,
  Clock,
  Check,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Minus,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Zap,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Circle,
  Gauge,
  Target,
  Shield,
  BarChart2,
  ArrowLeft,
  type LucideIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

// Option chain data schema
const optionSchema = z.object({
  strike: z.number(),
  lastPrice: z.number(),
  bid: z.number(),
  ask: z.number(),
  volume: z.number(),
  openInterest: z.number(),
  impliedVolatility: z.number(),
  delta: z.number(),
  gamma: z.number(),
  theta: z.number(),
  vega: z.number(),
  rho: z.number(),
});

type Option = z.infer<typeof optionSchema>;

// Strategy schema
const strategyFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  strategy: z.enum(['single', 'vertical', 'calendar', 'butterfly', 'condor', 'iron_condor', 'strangle', 'straddle', 'custom'], {
    required_error: 'Please select a strategy',
  }),
  // Single option
  optionType: z.enum(['call', 'put']).optional(),
  strike: z.number().positive('Strike price must be positive').optional(),
  expiration: z.string().optional(),
  // Vertical spread
  verticalType: z.enum(['bull_call', 'bear_put', 'bear_call', 'bull_put']).optional(),
  longStrike: z.number().positive('Strike price must be positive').optional(),
  shortStrike: z.number().positive('Strike price must be positive').optional(),
  // Multi-leg strategies
  legs: z.array(z.object({
    id: z.string(),
    type: z.enum(['call', 'put']),
    strike: z.number().positive('Strike price must be positive'),
    premium: z.number().optional(),
    action: z.enum(['buy', 'sell']),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    expiration: z.string(),
  })).optional(),
  // Order details
  orderType: z.enum(['limit', 'market', 'stop_limit']).default('limit'),
  limitPrice: z.number().positive('Price must be positive').optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK', 'DAY', 'GTD']).default('GTC'),
  goodTillDate: z.date().optional(),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

// Sample data
const expirations = [
  '2023-12-15',
  '2023-12-22',
  '2023-12-29',
  '2024-01-19',
  '2024-03-15',
  '2024-06-21',
  '2024-12-20',
  '2025-01-17',
];

const strikes = [
  350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 
  400, 405, 410, 415, 420, 425, 430, 435, 440, 445, 450
];

const generateOptionChain = (currentPrice: number) => {
  const atmStrike = Math.round(currentPrice / 5) * 5; // Round to nearest 5
  const startStrike = atmStrike - 50;
  const endStrike = atmStrike + 50;
  
  return strikes
    .filter(strike => strike >= startStrike && strike <= endStrike)
    .map(strike => {
      const isCall = strike >= atmStrike;
      const type = isCall ? 'call' : 'put';
      const moneyness = isCall 
        ? strike === atmStrike ? 'ATM' : 'OTM'
        : strike === atmStrike ? 'ATM' : 'ITM';
      
      const basePrice = 100 + Math.abs(atmStrike - strike) * 0.5;
      const iv = 0.3 + (Math.random() * 0.2); // 30-50% IV
      const delta = isCall 
        ? Math.min(0.99, 0.5 + (atmStrike - strike) / 100)
        : Math.max(-0.99, -0.5 + (atmStrike - strike) / 100);
      
      return {
        strike,
        type,
        moneyness,
        lastPrice: (basePrice * (0.9 + Math.random() * 0.2)).toFixed(2),
        bid: (basePrice * (0.88 + Math.random() * 0.1)).toFixed(2),
        ask: (basePrice * (1.02 + Math.random() * 0.1)).toFixed(2),
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 5000),
        impliedVolatility: (iv * 100).toFixed(1),
        delta: delta.toFixed(4),
        gamma: (0.01 + Math.random() * 0.02).toFixed(4),
        theta: (-0.02 - Math.random() * 0.03).toFixed(4),
        vega: (0.1 + Math.random() * 0.1).toFixed(4),
        rho: (0.05 + Math.random() * 0.1).toFixed(4),
      };
    });
};

// Strategy presets
const strategyPresets = [
  {
    id: 'single',
    name: 'Single Option',
    description: 'Buy or sell a single call or put option',
    icon: BarChart3,
    complexity: 'Beginner',
    risk: 'High',
    maxLoss: 'Premium Paid',
    maxGain: 'Unlimited (Long Call/Put) or Premium (Short)',
  },
  {
    id: 'vertical',
    name: 'Vertical Spread',
    description: 'Bull call, bear put, bear call, or bull put spread',
    icon: TrendingUp,
    complexity: 'Intermediate',
    risk: 'Limited',
    maxLoss: 'Limited',
    maxGain: 'Limited',
  },
  {
    id: 'calendar',
    name: 'Calendar Spread',
    description: 'Sell short-term and buy long-term options with the same strike',
    icon: Calendar,
    complexity: 'Advanced',
    risk: 'Limited',
    maxLoss: 'Net Premium Paid',
    maxGain: 'Potentially High',
  },
  {
    id: 'butterfly',
    name: 'Butterfly Spread',
    description: 'Combination of bull and bear spreads with three strike prices',
    icon: Circle,
    complexity: 'Advanced',
    risk: 'Limited',
    maxLoss: 'Net Premium Paid',
    maxGain: 'Limited',
  },
  {
    id: 'condor',
    name: 'Iron Condor',
    description: 'Sell an OTM call and put, buy a further OTM call and put',
    icon: Target,
    complexity: 'Advanced',
    risk: 'Limited',
    maxLoss: 'Limited',
    maxGain: 'Premium Received',
  },
  {
    id: 'strangle',
    name: 'Strangle',
    description: 'Buy or sell an OTM call and an OTM put',
    icon: ArrowUpDown,
    complexity: 'Intermediate',
    risk: 'Limited/Unlimited',
    maxLoss: 'Premium Paid (Long) or Unlimited (Short)',
    maxGain: 'Unlimited (Long) or Premium (Short)',
  },
  {
    id: 'straddle',
    name: 'Straddle',
    description: 'Buy or sell a call and put at the same strike price',
    icon: Gauge,
    complexity: 'Intermediate',
    risk: 'Limited/Unlimited',
    maxLoss: 'Premium Paid (Long) or Unlimited (Short)',
    maxGain: 'Unlimited (Long) or Premium (Short)',
  },
  {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Build your own multi-leg options strategy',
    icon: Settings,
    complexity: 'Expert',
    risk: 'Varies',
    maxLoss: 'Varies',
    maxGain: 'Varies',
  },
];

// Greek letters for display
const greeks = [
  { name: 'Delta', key: 'delta', description: 'Rate of change of option price relative to the underlying asset price' },
  { name: 'Gamma', key: 'gamma', description: 'Rate of change of delta relative to the underlying asset price' },
  { name: 'Theta', key: 'theta', description: 'Rate of change of option price relative to time decay' },
  { name: 'Vega', key: 'vega', description: 'Rate of change of option price relative to implied volatility' },
  { name: 'Rho', key: 'rho', description: 'Rate of change of option price relative to interest rates' },
];

// Risk profile indicators
const riskProfiles = [
  { level: 'Low', color: 'bg-green-500', description: 'Defensive - Capital preservation' },
  { level: 'Moderate', color: 'bg-blue-500', description: 'Balanced - Growth with some risk' },
  { level: 'High', color: 'bg-yellow-500', description: 'Growth - Willing to accept higher risk' },
  { level: 'Aggressive', color: 'bg-orange-500', description: 'Speculative - High risk, high reward' },
  { level: 'Extreme', color: 'bg-red-500', description: 'Very High Risk - Potential for significant losses' },
];

export function OptionsTradingInterface() {
  const [activeTab, setActiveTab] = useState('chain');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState(expirations[0]);
  const [selectedStrikes, setSelectedStrikes] = useState<number[]>([]);
  const [customLegs, setCustomLegs] = useState<any[]>([]);
  
  const currentPrice = 412.50; // Example current price
  const optionChain = useMemo(() => generateOptionChain(currentPrice), [currentPrice]);
  const calls = optionChain.filter(opt => opt.type === 'call');
  const puts = optionChain.filter(opt => opt.type === 'put');

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      symbol: 'SPY',
      strategy: 'single',
      optionType: 'call',
      orderType: 'limit',
      quantity: 1,
      timeInForce: 'GTC',
    },
  });

  const watchStrategy = form.watch('strategy');
  const watchOptionType = form.watch('optionType');
  const watchVerticalType = form.watch('verticalType');
  const watchLegs = form.watch('legs');

  // Handle form submission
  const onSubmit = (data: StrategyFormValues) => {
    console.log('Options order submitted:', data);
    // Here you would typically send the order to your API
  };

  // Handle strategy selection
  const handleSelectStrategy = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    form.setValue('strategy', strategyId as any);
    setShowStrategyBuilder(true);
  };

  // Toggle strike selection
  const toggleStrike = (strike: number) => {
    setSelectedStrikes(prev => 
      prev.includes(strike) 
        ? prev.filter(s => s !== strike)
        : [...prev, strike].sort((a, b) => a - b)
    );
  };

  // Add a custom leg to the strategy
  const addCustomLeg = () => {
    if (selectedStrikes.length === 0) return;
    
    const newLegs = selectedStrikes.map((strike, index) => ({
      id: `leg-${Date.now()}-${index}`,
      type: watchOptionType,
      strike,
      action: 'buy',
      quantity: 1,
      expiration: selectedExpiration,
    }));
    
    form.setValue('legs', [...(watchLegs || []), ...newLegs]);
    setSelectedStrikes([]);
  };

  // Remove a leg from the strategy
  const removeLeg = (legId: string) => {
    form.setValue('legs', (watchLegs || []).filter(leg => leg.id !== legId));
  };

  // Render strategy builder based on selected strategy
  const renderStrategyBuilder = () => {
    if (!selectedStrategy) return null;

    switch (selectedStrategy) {
      case 'single':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="optionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="call">Call (Right to Buy)</SelectItem>
                        <SelectItem value="put">Put (Right to Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="strike"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strike Price</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseFloat(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select strike price" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-auto">
                        {strikes.map(strike => (
                          <SelectItem key={strike} value={strike.toString()}>
                            ${strike.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-auto">
                        {expirations.map(date => (
                          <SelectItem key={date} value={date}>
                            {new Date(date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric' 
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" className="w-full" size="lg">
                Place Order
              </Button>
            </div>
          </div>
        );

      case 'vertical':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="verticalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertical Spread Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select spread type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bull_call">Bull Call Spread</SelectItem>
                      <SelectItem value="bear_put">Bear Put Spread</SelectItem>
                      <SelectItem value="bear_call">Bear Call Spread</SelectItem>
                      <SelectItem value="bull_put">Bull Put Spread</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchVerticalType && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="longStrike"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Long Strike</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseFloat(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select long strike" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-auto">
                            {strikes.map(strike => (
                              <SelectItem key={`long-${strike}`} value={strike.toString()}>
                                ${strike.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="shortStrike"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Strike</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseFloat(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select short strike" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-auto">
                            {strikes.map(strike => (
                              <SelectItem 
                                key={`short-${strike}`} 
                                value={strike.toString()}
                                disabled={watchVerticalType?.includes('bull') 
                                  ? strike <= (form.getValues('longStrike') || 0)
                                  : strike >= (form.getValues('longStrike') || Infinity)
                                }
                              >
                                ${strike.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium mb-2">Strategy Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Max Profit</div>
                      <div className="font-medium">$1,250.00</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max Loss</div>
                      <div className="font-medium">$750.00</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Breakeven</div>
                      <div className="font-medium">$405.50</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Probability of Profit</div>
                      <div className="font-medium">65%</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button type="submit" className="w-full" size="lg">
                    Place Spread Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Strikes</Label>
                <div className="mt-1 space-y-1 max-h-60 overflow-auto p-2 border rounded-md">
                  {strikes.map(strike => (
                    <div 
                      key={strike}
                      className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                        selectedStrikes.includes(strike) 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleStrike(strike)}
                    >
                      <span>${strike.toFixed(2)}</span>
                      {selectedStrikes.includes(strike) && <Check className="h-4 w-4" />}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex space-x-2">
                  <Select 
                    value={watchOptionType}
                    onValueChange={(value) => form.setValue('optionType', value as 'call' | 'put')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="put">Put</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={selectedExpiration}
                    onValueChange={setSelectedExpiration}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      {expirations.map(date => (
                        <SelectItem key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addCustomLeg}
                    disabled={selectedStrikes.length === 0}
                  >
                    Add Leg
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Strategy Legs</Label>
                <div className="mt-1 space-y-2">
                  {(watchLegs || []).length > 0 ? (
                    <div className="space-y-2">
                      {watchLegs?.map((leg, index) => (
                        <div key={leg.id} className="p-3 border rounded-md flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {leg.action === 'buy' ? 'Buy' : 'Sell'} {leg.quantity} {leg.type.toUpperCase()} ${leg.strike}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(leg.expiration).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeLeg(leg.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="p-3 bg-muted/20 rounded-md">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Max Risk</div>
                            <div className="font-medium">$1,250.00</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Max Reward</div>
                            <div className="font-medium">$3,450.00</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Breakeven</div>
                            <div className="font-medium">$405.50 - $425.75</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Probability</div>
                            <div className="font-medium">72%</div>
                          </div>
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" size="lg">
                        Place Multi-Leg Order
                      </Button>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-md text-muted-foreground">
                      <p>Add legs to build your strategy</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Settings className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Strategy Builder</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a strategy type to get started
            </p>
          </div>
        );
    }
  };

  // Render option chain
  const renderOptionChain = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Option Chain</h3>
        <div className="flex items-center space-x-2">
          <Select defaultValue={selectedExpiration} onValueChange={setSelectedExpiration}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              {expirations.map(date => (
                <SelectItem key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStrategyBuilder(true)}
          >
            Strategy Builder
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Strike</th>
              <th className="text-right p-2">Bid</th>
              <th className="text-right p-2">Ask</th>
              <th className="text-right p-2">Last</th>
              <th className="text-right p-2">Vol</th>
              <th className="text-right p-2">OI</th>
              <th className="text-right p-2">IV</th>
              <th className="text-right p-2">Delta</th>
              <th className="text-right p-2">Gamma</th>
              <th className="text-right p-2">Theta</th>
              <th className="text-right p-2">Vega</th>
              <th className="text-right p-2">Rho</th>
            </tr>
          </thead>
          <tbody>
            {puts.map((put, index) => {
              const call = calls.find(c => c.strike === put.strike);
              const isAtm = Math.abs(put.strike - currentPrice) < 2.5;
              
              return (
                <tr 
                  key={put.strike} 
                  className={`border-b hover:bg-muted/50 ${isAtm ? 'bg-primary/5' : ''}`}
                >
                  {/* Put side */}
                  <td className="text-right p-2 text-red-500">{put.bid} × {put.ask}</td>
                  <td className="text-right p-2">{put.volume}</td>
                  <td className="text-right p-2">{put.openInterest}</td>
                  <td className="text-right p-2">{put.impliedVolatility}%</td>
                  
                  {/* Strike */}
                  <td className="text-center p-2 font-medium">
                    <div className="flex flex-col items-center">
                      <span className={isAtm ? 'font-bold' : ''}>
                        ${put.strike}
                      </span>
                      {isAtm && <div className="h-1 w-1 rounded-full bg-primary mt-1"></div>}
                    </div>
                  </td>
                  
                  {/* Call side */}
                  {call ? (
                    <>
                      <td className="text-right p-2 text-green-500">{call.bid} × {call.ask}</td>
                      <td className="text-right p-2">{call.volume}</td>
                      <td className="text-right p-2">{call.openInterest}</td>
                      <td className="text-right p-2">{call.impliedVolatility}%</td>
                      <td className="text-right p-2">{call.delta}</td>
                      <td className="text-right p-2">{call.gamma}</td>
                      <td className="text-right p-2">{call.theta}</td>
                      <td className="text-right p-2">{call.vega}</td>
                      <td className="text-right p-2">{call.rho}</td>
                    </>
                  ) : (
                    <td colSpan={7} className="p-2"></td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render strategy cards
  const renderStrategyCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {strategyPresets.map((strategy) => (
        <Card 
          key={strategy.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedStrategy === strategy.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleSelectStrategy(strategy.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{strategy.name}</CardTitle>
              <div className="p-2 rounded-md bg-primary/10">
                <strategy.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <CardDescription>{strategy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Complexity</div>
              <div className="font-medium">{strategy.complexity}</div>
              
              <div className="text-muted-foreground">Risk</div>
              <div className="font-medium">{strategy.risk}</div>
              
              <div className="text-muted-foreground">Max Loss</div>
              <div className="font-medium">{strategy.maxLoss}</div>
              
              <div className="text-muted-foreground">Max Gain</div>
              <div className="font-medium">{strategy.maxGain}</div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectStrategy(strategy.id);
              }}
            >
              Build Strategy
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chain">Option Chain</TabsTrigger>
            <TabsTrigger value="strategies">Strategy Builder</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chain" className="mt-4">
            {renderOptionChain()}
          </TabsContent>
          
          <TabsContent value="strategies" className="mt-4">
            {showStrategyBuilder ? (
              <div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="mb-4"
                  onClick={() => {
                    setShowStrategyBuilder(false);
                    setSelectedStrategy(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Strategies
                </Button>
                
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedStrategy 
                        ? strategyPresets.find(s => s.id === selectedStrategy)?.name 
                        : 'Select a Strategy'}
                    </CardTitle>
                    <CardDescription>
                      {selectedStrategy && strategyPresets.find(s => s.id === selectedStrategy)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderStrategyBuilder()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Options Strategy Builder</h2>
                    <p className="text-muted-foreground">
                      Select a strategy to get started or build a custom strategy
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Select>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Strategies</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by market" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Markets</SelectItem>
                        <SelectItem value="bullish">Bullish</SelectItem>
                        <SelectItem value="bearish">Bearish</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="volatile">High Volatility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {renderStrategyCards()}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analyze" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Options Analysis</CardTitle>
                <CardDescription>
                  Analyze option strategies with advanced tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-4">Risk Profile</h3>
                      <div className="h-64 bg-muted/20 rounded flex items-end">
                        {[20, 40, 60, 80, 100].map((height, index) => (
                          <div 
                            key={index}
                            className={`flex-1 ${riskProfiles[index].color}`}
                            style={{ height: `${height}%` }}
                            title={`${riskProfiles[index].level} Risk: ${riskProfiles[index].description}`}
                          ></div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Low Risk</span>
                        <span>High Risk</span>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-4">Greeks Exposure</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {greeks.map((greek) => (
                          <TooltipProvider key={greek.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-3 border rounded-md text-center">
                                  <div className="text-sm font-medium">{greek.name}</div>
                                  <div className="text-2xl font-bold mt-1">
                                    {Math.random() > 0.5 ? '+' : ''}
                                    {(Math.random() * 0.5).toFixed(2)}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{greek.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Strategy Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Max Profit</div>
                            <div className="text-xl font-bold text-green-600">+$1,250.00</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              If underlying is above $450 at expiration
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Max Loss</div>
                            <div className="text-xl font-bold text-red-600">-$750.00</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              If underlying is below $400 at expiration
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Breakeven</div>
                            <div className="text-lg font-medium">$405.50 - $425.75</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Probability of Profit</div>
                            <div className="mt-1">
                              <div className="w-full bg-muted rounded-full h-2.5">
                                <div 
                                  className="bg-green-500 h-2.5 rounded-full" 
                                  style={{ width: '72%' }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>0%</span>
                                <span>72%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <Button className="w-full">Save Analysis</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <LineChart className="mr-2 h-4 w-4" />
                          View P&L Chart
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <PieChart className="mr-2 h-4 w-4" />
                          Risk Analysis
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <BarChart2 className="mr-2 h-4 w-4" />
                          Compare Strategies
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Shield className="mr-2 h-4 w-4" />
                          Risk Management
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}

export default OptionsTradingInterface;
