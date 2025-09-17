"use client";
'use client';

import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
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
  Minus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Order type schema
const orderFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell'], {
    required_error: 'Please select a side',
  }),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'bracket', 'OCO'], {
    required_error: 'Please select an order type',
  }),
  quantity: z.number().positive('Quantity must be positive'),
  limitPrice: z.number().positive('Price must be positive').optional(),
  stopPrice: z.number().positive('Price must be positive').optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK', 'DAY', 'GTC+EXT', 'OPG', 'CLS', 'GTD'], {
    required_error: 'Please select time in force',
  }),
  extendedHours: z.boolean().default(false),
  // Advanced fields
  takeProfit: z.object({
    enabled: z.boolean().default(false),
    price: z.number().positive('Price must be positive').optional(),
    amount: z.number().positive('Amount must be positive').optional(),
  }).optional(),
  stopLoss: z.object({
    enabled: z.boolean().default(false),
    price: z.number().positive('Price must be positive').optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    trailing: z.boolean().default(false),
    trailValue: z.number().positive('Value must be positive').optional(),
  }).optional(),
  // OCO (One-Cancels-Other) specific
  oco: z.object({
    limitPrice: z.number().positive('Price must be positive').optional(),
    stopPrice: z.number().positive('Price must be positive').optional(),
    stopLimitPrice: z.number().positive('Price must be positive').optional(),
  }).optional(),
  // Trailing stop specific
  trailValue: z.number().positive('Value must be positive').optional(),
  trailType: z.enum(['amount', 'percentage']).optional(),
  // Bracket order specific
  bracket: z.object({
    takeProfitPrice: z.number().positive('Price must be positive').optional(),
    stopLossPrice: z.number().positive('Price must be positive').optional(),
    stopLossTrigger: z.enum(['last', 'mark', 'index']).optional(),
  }).optional(),
  // Good Till Date
  goodTillDate: z.date().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

const defaultValues: Partial<OrderFormValues> = {
  side: 'buy',
  orderType: 'limit',
  timeInForce: 'GTC',
  extendedHours: false,
};

// Sample watchlist data
const watchlist = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.25, change: 1.23, changePercent: 0.65 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 423.68, change: -2.15, changePercent: -0.51 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 178.45, change: 3.42, changePercent: 1.95 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.19, change: 1.87, changePercent: 1.02 },
  { symbol: 'META', name: 'Meta Platforms', price: 497.48, change: -1.23, changePercent: -0.25 },
];

// Order type descriptions
const orderTypeDescriptions = {
  market: 'Execute immediately at the best available price',
  limit: 'Set a maximum price to buy or minimum price to sell',
  stop: 'Trigger a market order when price reaches a certain level',
  stop_limit: 'Trigger a limit order when price reaches a certain level',
  trailing_stop: 'Adjusts stop price as the market moves in your favor',
  bracket: 'Set profit taking and stop loss levels in a single order',
  OCO: 'Place two orders, one cancels the other',
};

// Time in force options
const timeInForceOptions = [
  { value: 'GTC', label: 'Good Till Cancel', description: 'Active until you cancel it' },
  { value: 'IOC', label: 'Immediate or Cancel', description: 'Fill immediately or cancel' },
  { value: 'FOK', label: 'Fill or Kill', description: 'Fill completely or cancel' },
  { value: 'DAY', label: 'Day', description: 'Cancel at market close' },
  { value: 'GTC+EXT', label: 'GTC + Extended Hours', description: 'Good till cancel, including extended hours' },
  { value: 'OPG', label: 'Market on Open', description: 'Execute at market open' },
  { value: 'CLS', label: 'Market on Close', description: 'Execute at market close' },
  { value: 'GTD', label: 'Good Till Date', description: 'Active until a specific date' },
];

export function AdvancedOrderEntry() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('limit');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [orderPreview, setOrderPreview] = useState<any>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues,
  });

  const watchOrderType = form.watch('orderType');
  const watchSide = form.watch('side');
  const watchTakeProfit = form.watch('takeProfit');
  const watchStopLoss = form.watch('stopLoss');

  // Handle form submission
  const onSubmit = (data: OrderFormValues) => {
    console.log('Order submitted:', data);
    setOrderPreview(data);
    // Here you would typically send the order to your API
  };

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    form.setValue('symbol', symbol);
    setSelectedSymbol(symbol);
    setShowSymbolSearch(false);
  };

  // Calculate order total
  const calculateTotal = () => {
    const quantity = form.getValues('quantity') || 0;
    const price = form.getValues('limitPrice') || 0;
    return (quantity * price).toFixed(2);
  };

  // Toggle order side
  const toggleSide = () => {
    form.setValue('side', watchSide === 'buy' ? 'sell' : 'buy');
  };

  // Render order type tabs
  const renderOrderTypeTabs = () => (
    <Tabs 
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value);
        form.setValue('orderType', value as any);
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4 h-10">
        <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
        <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
        <TabsTrigger value="stop" className="text-xs">Stop</TabsTrigger>
        <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // Render order form based on order type
  const renderOrderForm = () => {
    switch (activeTab) {
      case 'market':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeInForce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time in Force</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time in force" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeInForceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
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
                name="extendedHours"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end h-full">
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Extended Hours</FormLabel>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Allow order execution during pre-market and after-hours sessions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full" size="lg">
                {watchSide === 'buy' ? 'Buy' : 'Sell'} {form.getValues('symbol') || 'Stock'}
              </Button>
            </div>
          </div>
        );
      
      case 'limit':
      case 'stop':
      case 'stop_limit':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-8"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {activeTab === 'stop' || activeTab === 'stop_limit' ? (
                <FormField
                  control={form.control}
                  name="stopPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

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

              <FormField
                control={form.control}
                name="timeInForce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time in Force</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time in force" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeInForceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated {watchSide === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                <span className="font-medium">${calculateTotal()}</span>
              </div>
              {watchSide === 'buy' && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">$25,430.67</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" size="lg">
                {watchSide === 'buy' ? 'Buy' : 'Sell'} {form.getValues('symbol') || 'Stock'}
              </Button>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-4">
            <Collapsible
              open={isAdvancedOpen}
              onOpenChange={setIsAdvancedOpen}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Advanced Order Types</h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isAdvancedOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className={`h-20 flex-col items-center justify-center ${form.watch('orderType') === 'trailing_stop' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => form.setValue('orderType', 'trailing_stop')}
                  >
                    <TrendingUp className="h-5 w-5 mb-1" />
                    <span className="text-xs">Trailing Stop</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`h-20 flex-col items-center justify-center ${form.watch('orderType') === 'bracket' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => form.setValue('orderType', 'bracket')}
                  >
                    <ArrowUpDown className="h-5 w-5 mb-1" />
                    <span className="text-xs">Bracket Order</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`h-20 flex-col items-center justify-center ${form.watch('orderType') === 'OCO' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => form.setValue('orderType', 'OCO')}
                  >
                    <div className="relative h-5 w-5 mb-1">
                      <TrendingUp className="absolute top-0 left-0 h-4 w-4" />
                      <TrendingDown className="absolute bottom-0 right-0 h-4 w-4" />
                    </div>
                    <span className="text-xs">OCO</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col items-center justify-center opacity-50"
                    disabled
                  >
                    <div className="h-5 w-5 mb-1 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                    <span className="text-xs text-muted-foreground/50">More</span>
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {form.watch('orderType') === 'trailing_stop' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="trailType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trail Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trail type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="amount">Amount ($)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Trail {form.watch('trailType') === 'percentage' ? 'Percentage' : 'Amount'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {form.watch('trailType') === 'percentage' ? (
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <Input
                            type="number"
                            step={form.watch('trailType') === 'percentage' ? '0.01' : '0.01'}
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit" className="w-full" size="lg">
                    Place Trailing Stop Order
                  </Button>
                </div>
              </div>
            )}

            {form.watch('orderType') === 'bracket' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="bracket.takeProfitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Take Profit Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bracket.stopLossPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit" className="w-full" size="lg">
                    Place Bracket Order
                  </Button>
                </div>
              </div>
            )}

            {form.watch('orderType') === 'OCO' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="oco.limitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limit Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oco.stopPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oco.stopLimitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Limit Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit" className="w-full" size="lg">
                    Place OCO Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {watchSide === 'buy' ? 'Buy' : 'Sell'}{' '}
                {selectedSymbol || 'Stock'}
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={watchSide === 'buy' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => form.setValue('side', 'buy')}
                  className={watchSide === 'buy' ? '' : 'opacity-50'}
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={watchSide === 'sell' ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => form.setValue('side', 'sell')}
                  className={watchSide === 'sell' ? '' : 'opacity-50'}
                >
                  Sell
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Symbol Search */}
            <div className="relative mb-4">
              <div className="relative">
                <Input
                  placeholder="Search symbol"
                  value={selectedSymbol || ''}
                  onFocus={() => setShowSymbolSearch(true)}
                  readOnly
                  className="cursor-pointer"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowSymbolSearch(true)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <AnimatePresence>
                {showSymbolSearch && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-10 mt-1 w-full bg-card border rounded-md shadow-lg overflow-hidden"
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Input
                          placeholder="Search symbols..."
                          className="pl-8"
                          autoFocus
                        />
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {watchlist.map((item) => (
                        <button
                          key={item.symbol}
                          type="button"
                          className={`w-full text-left p-2 hover:bg-muted/50 flex justify-between items-center ${
                            selectedSymbol === item.symbol ? 'bg-muted/30' : ''
                          }`}
                          onClick={() => handleSymbolSelect(item.symbol)}
                        >
                          <div>
                            <div className="font-medium">{item.symbol}</div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${item.price.toFixed(2)}</div>
                            <div 
                              className={`text-xs ${
                                item.change >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}
                            >
                              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order Type Tabs */}
            {renderOrderTypeTabs()}

            {/* Order Form */}
            {renderOrderForm()}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

export default AdvancedOrderEntry;
