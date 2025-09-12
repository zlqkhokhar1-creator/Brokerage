// Mock data for the trading platform

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  shares: number;
  price: number;
  total: number;
  date: Date;
}

export interface PortfolioData {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
}

// Generate mock stock data
export const generateStockPrice = (basePrice: number) => {
  const change = (Math.random() - 0.5) * basePrice * 0.1;
  return {
    price: Number((basePrice + change).toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(((change / basePrice) * 100).toFixed(2))
  };
};

export const mockStocks: Stock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    ...generateStockPrice(182.50),
    volume: 52840000,
    marketCap: '2.8T'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    ...generateStockPrice(141.80),
    volume: 28940000,
    marketCap: '1.8T'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    ...generateStockPrice(378.85),
    volume: 31250000,
    marketCap: '2.8T'
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    ...generateStockPrice(153.40),
    volume: 42180000,
    marketCap: '1.6T'
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    ...generateStockPrice(248.42),
    volume: 67320000,
    marketCap: '790B'
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    ...generateStockPrice(484.49),
    volume: 19840000,
    marketCap: '1.2T'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    ...generateStockPrice(1208.88),
    volume: 45280000,
    marketCap: '3.0T'
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    ...generateStockPrice(614.30),
    volume: 4280000,
    marketCap: '264B'
  }
];

// Generate mock portfolio data
const createPosition = (stock: Stock, shares: number): Position => {
  const avgCost = stock.price * (0.8 + Math.random() * 0.4);
  const marketValue = stock.price * shares;
  const totalReturn = marketValue - (avgCost * shares);
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    shares,
    avgCost: Number(avgCost.toFixed(2)),
    currentPrice: stock.price,
    marketValue: Number(marketValue.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    totalReturnPercent: Number(((totalReturn / (avgCost * shares)) * 100).toFixed(2))
  };
};

export const mockPortfolio: PortfolioData = {
  totalValue: 0,
  totalReturn: 0,
  totalReturnPercent: 0,
  dayChange: 0,
  dayChangePercent: 0,
  positions: [
    createPosition(mockStocks[0], 50), // AAPL
    createPosition(mockStocks[1], 25), // GOOGL
    createPosition(mockStocks[2], 30), // MSFT
    createPosition(mockStocks[3], 40), // AMZN
    createPosition(mockStocks[4], 20), // TSLA
  ]
};

// Calculate portfolio totals
mockPortfolio.totalValue = mockPortfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
mockPortfolio.totalReturn = mockPortfolio.positions.reduce((sum, pos) => sum + pos.totalReturn, 0);
mockPortfolio.totalReturnPercent = (mockPortfolio.totalReturn / (mockPortfolio.totalValue - mockPortfolio.totalReturn)) * 100;
mockPortfolio.dayChange = mockPortfolio.positions.reduce((sum, pos) => {
  const dayChange = mockStocks.find(s => s.symbol === pos.symbol)?.change || 0;
  return sum + (dayChange * pos.shares);
}, 0);
mockPortfolio.dayChangePercent = (mockPortfolio.dayChange / mockPortfolio.totalValue) * 100;

// Generate mock transactions
export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'BUY',
    symbol: 'AAPL',
    shares: 10,
    price: 180.00,
    total: 1800.00,
    date: new Date(Date.now() - 86400000 * 2) // 2 days ago
  },
  {
    id: '2',
    type: 'BUY',
    symbol: 'GOOGL',
    shares: 5,
    price: 140.00,
    total: 700.00,
    date: new Date(Date.now() - 86400000 * 5) // 5 days ago
  },
  {
    id: '3',
    type: 'SELL',
    symbol: 'TSLA',
    shares: 3,
    price: 245.00,
    total: 735.00,
    date: new Date(Date.now() - 86400000 * 7) // 1 week ago
  },
  {
    id: '4',
    type: 'BUY',
    symbol: 'MSFT',
    shares: 8,
    price: 375.00,
    total: 3000.00,
    date: new Date(Date.now() - 86400000 * 10) // 10 days ago
  }
];

// Generate mock portfolio performance data for charts
export const generatePortfolioHistory = () => {
  const data = [];
  const startValue = mockPortfolio.totalValue * 0.9;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const variation = (Math.random() - 0.5) * startValue * 0.05;
    const value = startValue + (startValue * 0.1 * (30 - i) / 30) + variation;
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Number(value.toFixed(2))
    });
  }
  
  return data;
};

export const portfolioHistory = generatePortfolioHistory();