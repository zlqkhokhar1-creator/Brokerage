import { NextResponse } from 'next/server';

// Mock portfolio data - in production, this would come from a database
const mockPortfolioData = {
  totalValue: 125430.50,
  dayChange: 3125.75,
  dayChangePercent: 2.56,
  holdings: [
    { symbol: 'AAPL', shares: 50, avgPrice: 150.00, currentPrice: 175.43, value: 8771.50, change: 16.95 },
    { symbol: 'TSLA', shares: 25, avgPrice: 200.00, currentPrice: 245.67, value: 6141.75, change: 22.84 },
    { symbol: 'NVDA', shares: 15, avgPrice: 350.00, currentPrice: 432.12, value: 6481.80, change: 23.49 },
    { symbol: 'MSFT', shares: 30, avgPrice: 280.00, currentPrice: 335.89, value: 10076.70, change: 19.96 },
  ],
  lastUpdated: new Date().toISOString(),
};

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
  
  // Add some randomness to simulate real portfolio changes
  const randomVariation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
  const adjustedTotalValue = mockPortfolioData.totalValue * (1 + randomVariation);
  const adjustedDayChange = adjustedTotalValue - mockPortfolioData.totalValue;
  const adjustedDayChangePercent = (adjustedDayChange / mockPortfolioData.totalValue) * 100;
  
  return NextResponse.json({
    totalValue: Number(adjustedTotalValue.toFixed(2)),
    dayChange: Number(adjustedDayChange.toFixed(2)),
    dayChangePercent: Number(adjustedDayChangePercent.toFixed(2)),
    holdings: mockPortfolioData.holdings.map(holding => ({
      ...holding,
      currentPrice: holding.currentPrice * (1 + randomVariation * 0.5),
      value: holding.shares * (holding.currentPrice * (1 + randomVariation * 0.5)),
    })),
    lastUpdated: new Date().toISOString(),
  });
}
