import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DollarSign, TrendingUp, Zap } from "lucide-react";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { motion } from 'framer-motion';

const performanceData = [
    { name: 'Jan', value: 1000 },
    { name: 'Feb', value: 1200 },
    { name: 'Mar', value: 1100 },
    { name: 'Apr', value: 1500 },
    { name: 'May', value: 1800 },
    { name: 'Jun', value: 1700 },
];

const transactions = [
    { id: 1, type: 'Buy', stock: 'AAPL', amount: '$1,500', date: '2024-06-10' },
    { id: 2, type: 'Sell', stock: 'GOOGL', amount: '$2,000', date: '2024-06-08' },
    { id: 3, type: 'Deposit', stock: '', amount: '$5,000', date: '2024-06-05' },
];

const DashboardPage = () => {
  return (
    <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$1,234,567.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Gain/Loss</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">+$5,432.10</div>
                        <p className="text-xs text-muted-foreground">+2.5% today</p>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">Bought 10 shares of AAPL</div>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Portfolio Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <PerformanceChart data={performanceData} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="text-sm text-gray-500 dark:text-gray-400">
                                <th className="text-left py-2">Type</th>
                                <th className="text-left py-2">Stock</th>
                                <th className="text-left py-2">Amount</th>
                                <th className="text-left py-2">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="text-sm">
                                    <td className="py-2">{tx.type}</td>
                                    <td className="py-2">{tx.stock}</td>
                                    <td className="py-2">{tx.amount}</td>
                                    <td className="py-2">{tx.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default DashboardPage;
