import { Card, Title, Text } from "@tremor/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function Trading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="md:ml-64 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search stocks..."
                className="w-full bg-surface text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-text-secondary" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-surface text-white">
              <Title className="text-white">Popular Stocks</Title>
              <div className="space-y-4 mt-4">
                {[
                  { symbol: 'AAPL', name: 'Apple Inc.', price: 159.75, volume: '45.2M' },
                  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 245.50, volume: '32.1M' },
                  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 325.25, volume: '28.5M' },
                  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.50, volume: '22.3M' },
                  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 145.25, volume: '35.7M' },
                ].map(stock => (
                  <div key={stock.symbol} className="flex justify-between items-center p-2 hover:bg-opacity-50 hover:bg-background rounded cursor-pointer">
                    <div>
                      <Text className="font-semibold text-white">{stock.symbol}</Text>
                      <Text className="text-text-secondary">{stock.name}</Text>
                    </div>
                    <div className="text-right">
                      <Text className="text-white">${stock.price}</Text>
                      <Text className="text-text-secondary">Vol: {stock.volume}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-surface text-white">
              <Title className="text-white">Your Positions</Title>
              <div className="space-y-4 mt-4">
                {[
                  { symbol: 'AAPL', shares: 10, avgPrice: 150.25, currentPrice: 159.75 },
                  { symbol: 'MSFT', shares: 5, avgPrice: 310.50, currentPrice: 325.25 },
                ].map(position => {
                  const totalValue = position.shares * position.currentPrice;
                  const gain = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
                  
                  return (
                    <div key={position.symbol} className="flex justify-between items-center p-2 hover:bg-opacity-50 hover:bg-background rounded cursor-pointer">
                      <div>
                        <Text className="font-semibold text-white">{position.symbol}</Text>
                        <Text className="text-text-secondary">{position.shares} shares</Text>
                      </div>
                      <div className="text-right">
                        <Text className="text-white">${totalValue.toFixed(2)}</Text>
                        <Text className={gain >= 0 ? 'text-brand' : 'text-red-500'}>
                          {gain >= 0 ? '+' : ''}{gain.toFixed(2)}%
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
