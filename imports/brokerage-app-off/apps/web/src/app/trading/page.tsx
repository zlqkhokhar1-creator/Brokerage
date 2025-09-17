"use client";

import React, { useState } from 'react';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const dynamic = 'force-dynamic';

export default function TradingPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("100");
  const [orderType, setOrderType] = useState("market");
  const [price, setPrice] = useState("175.00");

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      <EnhancedNavigation currentPath="/trading" />
      <div className="lg:pl-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading</h1>
            <p className="text-gray-600">Execute trades with advanced order types and real-time market data</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Side</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant={side === "buy" ? "default" : "outline"}
                        onClick={() => setSide("buy")}
                        className={side === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        Buy
                      </Button>
                      <Button
                        variant={side === "sell" ? "default" : "outline"}
                        onClick={() => setSide("sell")}
                        className={side === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="orderType">Order Type</Label>
                    <Select value={orderType} onValueChange={setOrderType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop</SelectItem>
                        <SelectItem value="stop-limit">Stop Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {(orderType === "limit" || orderType === "stop-limit") && (
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="175.00"
                    />
                  </div>
                )}
                
                <Button 
                  className={`w-full ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  Place {side.charAt(0).toUpperCase() + side.slice(1)} Order
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Market Data - {symbol}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Last Price</div>
                      <div className="text-2xl font-bold text-green-600">$175.43</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Change</div>
                      <div className="text-2xl font-bold text-green-600">+$2.34</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Bid</div>
                      <div className="text-lg font-semibold">$175.40</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Ask</div>
                      <div className="text-lg font-semibold">$175.45</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Volume</div>
                      <div className="text-lg font-semibold">2.5M</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Market Cap</div>
                      <div className="text-lg font-semibold">$2.7T</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Symbol</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Side</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Quantity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Price</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">10:30 AM</td>
                      <td className="py-3 px-4 font-medium">AAPL</td>
                      <td className="py-3 px-4 text-green-600">Buy</td>
                      <td className="py-3 px-4">100</td>
                      <td className="py-3 px-4">$175.00</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Filled</span></td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">09:45 AM</td>
                      <td className="py-3 px-4 font-medium">TSLA</td>
                      <td className="py-3 px-4 text-red-600">Sell</td>
                      <td className="py-3 px-4">50</td>
                      <td className="py-3 px-4">$248.50</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


