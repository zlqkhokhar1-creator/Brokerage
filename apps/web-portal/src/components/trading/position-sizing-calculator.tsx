'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PositionSizingCalculatorProps {
  symbol: string;
  currentPrice: number;
}

interface PositionSizingResult {
  positionSize: number;
  dollarAmount: number;
  riskAmount: number;
  stopLossPrice: number;
  rewardRiskRatio: number;
  maxLoss: number;
  maxGain: number;
}

export function PositionSizingCalculator({ symbol, currentPrice }: PositionSizingCalculatorProps) {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [entryPrice, setEntryPrice] = useState(currentPrice);
  const [stopLoss, setStopLoss] = useState(currentPrice * 0.95);
  const [takeProfit, setTakeProfit] = useState(currentPrice * 1.10);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [calculationMethod, setCalculationMethod] = useState<'percentage' | 'fixed'>('percentage');
  const [result, setResult] = useState<PositionSizingResult | null>(null);

  useEffect(() => {
    calculatePositionSize();
  }, [accountBalance, riskPercentage, entryPrice, stopLoss, takeProfit, riskPerTrade, calculationMethod]);

  const calculatePositionSize = () => {
    const riskAmount = calculationMethod === 'percentage' 
      ? (accountBalance * riskPercentage) / 100
      : riskPerTrade;

    const priceRisk = Math.abs(entryPrice - stopLoss);
    const positionSize = Math.floor(riskAmount / priceRisk);
    const dollarAmount = positionSize * entryPrice;
    const rewardRiskRatio = Math.abs(takeProfit - entryPrice) / priceRisk;
    const maxLoss = positionSize * priceRisk;
    const maxGain = positionSize * Math.abs(takeProfit - entryPrice);

    setResult({
      positionSize,
      dollarAmount,
      riskAmount,
      stopLossPrice: stopLoss,
      rewardRiskRatio,
      maxLoss,
      maxGain
    });
  };

  const getRiskLevel = (percentage: number) => {
    if (percentage <= 1) return { level: 'Conservative', color: 'text-green-500' };
    if (percentage <= 2) return { level: 'Moderate', color: 'text-yellow-500' };
    if (percentage <= 3) return { level: 'Aggressive', color: 'text-orange-500' };
    return { level: 'High Risk', color: 'text-red-500' };
  };

  const riskLevel = getRiskLevel(riskPercentage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Position Sizing Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Account Balance ($)</Label>
                <Input
                  id="balance"
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Calculation Method</Label>
                <Select value={calculationMethod} onValueChange={(value: 'percentage' | 'fixed') => setCalculationMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Risk Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Dollar Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Risk Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Risk Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculationMethod === 'percentage' ? (
                <div className="space-y-2">
                  <Label htmlFor="riskPercentage">Risk Percentage (%)</Label>
                  <Input
                    id="riskPercentage"
                    type="number"
                    value={riskPercentage}
                    onChange={(e) => setRiskPercentage(Number(e.target.value))}
                    placeholder="2"
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                  <div className={`text-sm ${riskLevel.color}`}>
                    Risk Level: {riskLevel.level}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="riskPerTrade">Risk Per Trade ($)</Label>
                  <Input
                    id="riskPerTrade"
                    type="number"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                    placeholder="200"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Trade Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Trade Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice">Entry Price ($)</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  placeholder="175.43"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss ($)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  placeholder="166.66"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="takeProfit">Take Profit ($)</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  placeholder="192.97"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Position Sizing Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Position Size</span>
                  </div>
                  <div className="text-2xl font-bold">{result.positionSize.toLocaleString()} shares</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Total Investment</span>
                  </div>
                  <div className="text-2xl font-bold">${result.dollarAmount.toLocaleString()}</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Risk Amount</span>
                  </div>
                  <div className="text-2xl font-bold">${result.riskAmount.toLocaleString()}</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-2">Reward/Risk Ratio</div>
                  <div className="text-2xl font-bold">{result.rewardRiskRatio.toFixed(2)}:1</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-2">Max Loss</div>
                  <div className="text-2xl font-bold text-red-500">-${result.maxLoss.toLocaleString()}</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-2">Max Gain</div>
                  <div className="text-2xl font-bold text-green-500">+${result.maxGain.toLocaleString()}</div>
                </div>
              </div>

              {/* Risk Warnings */}
              {result.rewardRiskRatio < 1 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: Your reward/risk ratio is less than 1:1. Consider adjusting your take profit or stop loss levels.
                  </AlertDescription>
                </Alert>
              )}

              {result.dollarAmount > accountBalance * 0.5 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: This position represents more than 50% of your account balance. Consider reducing position size.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setEntryPrice(currentPrice);
                setStopLoss(currentPrice * 0.95);
                setTakeProfit(currentPrice * 1.10);
              }}
              variant="outline"
            >
              Use Current Price
            </Button>
            <Button 
              onClick={() => {
                setAccountBalance(10000);
                setRiskPercentage(2);
                setEntryPrice(currentPrice);
                setStopLoss(currentPrice * 0.95);
                setTakeProfit(currentPrice * 1.10);
              }}
              variant="outline"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
