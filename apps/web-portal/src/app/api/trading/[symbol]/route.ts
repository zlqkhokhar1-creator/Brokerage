import { NextRequest, NextResponse } from 'next/server';

// Mock trading data - in production, this would connect to real market data
const mockTradingData = {
  AAPL: { symbol: 'AAPL', price: 175.43, change: 3.45, changePercent: 2.01, volume: 45200000 },
  TSLA: { symbol: 'TSLA', price: 245.67, change: 2.89, changePercent: 1.19, volume: 32100000 },
  NVDA: { symbol: 'NVDA', price: 432.12, change: -1.23, changePercent: -0.28, volume: 28700000 },
  MSFT: { symbol: 'MSFT', price: 335.89, change: 1.67, changePercent: 0.50, volume: 25400000 },
  GOOGL: { symbol: 'GOOGL', price: 142.56, change: 0.89, changePercent: 0.63, volume: 19800000 },
  AMZN: { symbol: 'AMZN', price: 158.23, change: -0.45, changePercent: -0.28, volume: 17600000 },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  const data = mockTradingData[symbol as keyof typeof mockTradingData];
  
  if (!data) {
    return NextResponse.json(
      { error: 'Symbol not found' },
      { status: 404 }
    );
  }
  
  // Add some randomness to simulate real market data
  const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
  const adjustedPrice = data.price * (1 + randomVariation);
  const adjustedChange = adjustedPrice - data.price;
  const adjustedChangePercent = (adjustedChange / data.price) * 100;
  
  return NextResponse.json({
    symbol: data.symbol,
    price: Number(adjustedPrice.toFixed(2)),
    change: Number(adjustedChange.toFixed(2)),
    changePercent: Number(adjustedChangePercent.toFixed(2)),
    volume: data.volume,
    timestamp: new Date().toISOString(),
  });
}
