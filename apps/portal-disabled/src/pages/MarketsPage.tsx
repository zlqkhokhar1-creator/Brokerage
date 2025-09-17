import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const marketData = [
    { id: 1, symbol: 'AAPL', name: 'Apple Inc.', price: 150.25, change: 1.5, volume: '1.2M' },
    { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2800.50, change: -0.5, volume: '800K' },
    { id: 3, symbol: 'TSLA', name: 'Tesla, Inc.', price: 700.75, change: 2.1, volume: '2.5M' },
    { id: 4, symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 3400.00, change: 0.8, volume: '1.1M' },
    { id: 5, symbol: 'MSFT', name: 'Microsoft Corporation', price: 300.00, change: -0.2, volume: '1.5M' },
];

const MarketsPage = () => {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
            <table className="w-full">
                <thead>
                    <tr className="text-sm text-gray-500 dark:text-gray-400">
                        <th className="text-left py-2">Symbol</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Price</th>
                        <th className="text-left py-2">Change</th>
                        <th className="text-left py-2">Volume</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {marketData.map(stock => (
                        <tr key={stock.id} className="text-sm">
                            <td className="py-2 font-bold">{stock.symbol}</td>
                            <td className="py-2">{stock.name}</td>
                            <td className="py-2">${stock.price.toFixed(2)}</td>
                            <td className={`py-2 flex items-center ${stock.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {stock.change > 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                                {stock.change.toFixed(2)}%
                            </td>
                            <td className="py-2">{stock.volume}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CardContent>
    </Card>
  );
};

export default MarketsPage;
