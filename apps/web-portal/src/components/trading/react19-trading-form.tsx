'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSimpleAction, useOptimisticUpdate } from '@/lib/hooks/use-simple-action';
import { useState, startTransition } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface TradingFormProps {
  symbol: string;
  currentPrice: number;
}

export function React19TradingForm({ symbol, currentPrice }: TradingFormProps) {
  const [quantity, setQuantity] = useState('');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  
  // Simple action state
  const { state, submitAction, isPending } = useSimpleAction(
    async (prevState: any, formData: FormData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = formData.get('action') as string;
      const symbol = formData.get('symbol') as string;
      const quantity = formData.get('quantity') as string;
      
      return {
        lastAction: action,
        lastSymbol: symbol,
        lastQuantity: quantity,
        timestamp: new Date().toISOString(),
        success: true,
      };
    },
    {
      lastAction: null,
      lastSymbol: null,
      lastQuantity: null,
      timestamp: null,
      success: false,
    }
  );
  
  // Optimistic updates for better UX
  const { optimisticData, addOptimistic } = useOptimisticUpdate(
    { price: currentPrice, lastUpdate: new Date() },
    (current, optimistic) => optimistic
  );

  // Add optimistic update when form is submitted
  const handleFormSubmit = () => {
    addOptimistic({
      price: currentPrice + (action === 'buy' ? 0.01 : -0.01),
      lastUpdate: new Date(),
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {action === 'buy' ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          {action.toUpperCase()} {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submitAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={action === 'buy' ? 'default' : 'outline'}
              onClick={() => setAction('buy')}
              className="w-full"
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={action === 'sell' ? 'default' : 'outline'}
              onClick={() => setAction('sell')}
              className="w-full"
            >
              Sell
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>

          <input type="hidden" name="action" value={action} />
          <input type="hidden" name="symbol" value={symbol} />

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !quantity}
            onClick={handleFormSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `${action.toUpperCase()} ${quantity} shares`
            )}
          </Button>
        </form>

        {/* Optimistic price display */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            Current Price (Optimistic)
          </div>
          <div className="text-lg font-semibold">
            ${optimisticData.price.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {optimisticData.lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Action state display */}
        {state.success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              ✅ {state.lastAction?.toUpperCase()} order for {state.lastQuantity} shares of {state.lastSymbol} submitted!
            </div>
            <div className="text-xs text-green-600">
              {new Date(state.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
