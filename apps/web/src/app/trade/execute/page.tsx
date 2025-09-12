'use client';

import { useState, useEffect } from 'react';
import SlideToExecute from '@/components/SlideToExecute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { tradingService } from '@/lib/api/trading';

export default function ExecuteOrderPage() {
  const [orderData] = useState({
    symbol: 'AAPL',
    side: 'buy' as const,
    quantity: 10,
    type: 'market' as const,
    estimatedValue: 1750.00,
    estimatedFees: 2.50
  });

  const [slideRequirements] = useState({
    securityLevel: 'MEDIUM' as const,
    biometric: true,
    deviceVerification: true,
    locationVerification: false,
    slideComplexity: 'MEDIUM' as const
  });

  const [riskWarnings] = useState([
    'Market orders execute immediately at current market price',
    'Price may vary from estimate due to market volatility',
    'This order cannot be cancelled once executed'
  ]);

  const [executionStatus, setExecutionStatus] = useState<'pending' | 'executing' | 'success' | 'error'>('pending');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [slideToken, setSlideToken] = useState<string | null>(null);

  // Prepare slide order on component mount
  useEffect(() => {
    const prepareOrder = async () => {
      try {
        const preparation = await tradingService.prepareSlideOrder(orderData, slideRequirements);
        setSlideToken(preparation.slideToken);
      } catch (error) {
        console.error('Failed to prepare slide order:', error);
      }
    };
    prepareOrder();
  }, []);

  const handleExecute = async (slideData: any) => {
    try {
      if (!slideToken) {
        throw new Error('Order not prepared');
      }

      setExecutionStatus('executing');
      
      // Use the trading service to execute the order
      const result = await tradingService.executeSlideOrder(slideToken, slideData);
      setExecutionResult(result);
      setExecutionStatus('success');
    } catch (error) {
      console.error('Order execution failed:', error);
      setExecutionStatus('error');
    }
  };

  const handleCancel = () => {
    setExecutionStatus('pending');
    setExecutionResult(null);
  };

  if (executionStatus === 'success') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-green-400">Order Executed Successfully</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Order ID</p>
                  <p className="font-mono text-sm">{executionResult?.orderId}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Execution Price</p>
                  <p className="text-2xl font-bold">${executionResult?.executionPrice || '175.25'}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Shares Purchased</p>
                  <p className="text-xl">{orderData.quantity} shares of {orderData.symbol}</p>
                </div>
                <Button asChild className="w-full mt-6">
                  <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (executionStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <CardTitle className="text-red-400">Order Execution Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-center text-gray-400">
                  We encountered an error while executing your order. Please try again or contact support.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleCancel} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/dashboard">Cancel Order</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Link href="/trade" className="p-2">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-semibold">Execute Order</h1>
          <div className="w-10" />
        </div>

        {/* Order Summary */}
        <div className="px-4 mb-6">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardHeader>
              <CardTitle className="text-center">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Symbol</span>
                  <span>{orderData.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Action</span>
                  <span className={orderData.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {orderData.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity</span>
                  <span>{orderData.quantity} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Type</span>
                  <span>{orderData.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Value</span>
                  <span>${orderData.estimatedValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Fees</span>
                  <span>${orderData.estimatedFees.toFixed(2)}</span>
                </div>
                <hr className="border-[#1E1E1E]" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(orderData.estimatedValue + orderData.estimatedFees).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Slide to Execute Component */}
        <div className="px-4">
          <SlideToExecute
            orderData={{
              ...orderData,
              side: orderData.side.toUpperCase() as 'BUY' | 'SELL',
              orderType: orderData.type.toUpperCase()
            }}
            slideRequirements={slideRequirements}
            riskWarnings={riskWarnings}
            onExecute={handleExecute}
            onCancel={handleCancel}
            isLoading={executionStatus === 'executing'}
          />
        </div>
      </div>
    </div>
  );
}
