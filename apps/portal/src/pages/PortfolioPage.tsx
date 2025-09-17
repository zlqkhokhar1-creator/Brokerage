import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import PortfolioPieChart from "@/components/charts/PortfolioPieChart";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const portfolioData = [
    { name: 'Stocks', value: 60 },
    { name: 'Bonds', value: 30 },
    { name: 'Real Estate', value: 5 },
    { name: 'Cash', value: 5 },
];

const holdings = [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', shares: 10, price: 150, value: 1500, change: 1.5 },
    { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 5, price: 2800, value: 14000, change: -0.5 },
    { id: 3, symbol: 'TSLA', name: 'Tesla, Inc.', shares: 8, price: 700, value: 5600, change: 2.1 },
];

const PortfolioPage = () => {
  return (
    <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <Card>
                <CardHeader>
                    <CardTitle>Total Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">$21,100.00</div>
                </CardContent>
            </Card>
            {/* Other summary cards */}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="text-sm text-gray-500 dark:text-gray-400">
                                <th className="text-left py-2">Symbol</th>
                                <th className="text-left py-2">Name</th>
                                <th className="text-left py-2">Shares</th>
                                <th className="text-left py-2">Price</th>
                                <th className="text-left py-2">Value</th>
                                <th className="text-left py-2">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {holdings.map(holding => (
                                <tr key={holding.id} className="text-sm">
                                    <td className="py-2 font-bold">{holding.symbol}</td>
                                    <td className="py-2">{holding.name}</td>
                                    <td className="py-2">{holding.shares}</td>
                                    <td className="py-2">${holding.price.toFixed(2)}</td>
                                    <td className="py-2">${holding.value.toFixed(2)}</td>
                                    <td className={`py-2 flex items-center ${holding.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {holding.change > 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                                        {holding.change.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                    <PortfolioPieChart data={portfolioData} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default PortfolioPage;
