import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useState } from "react";

const allTransactions = [
    { id: 1, type: 'Buy', details: '10 shares of AAPL', amount: '$1,500.00', date: '2024-06-10' },
    { id: 2, type: 'Sell', details: '5 shares of GOOGL', amount: '$14,000.00', date: '2024-06-08' },
    { id: 3, type: 'Deposit', details: 'Bank Transfer', amount: '$5,000.00', date: '2024-06-05' },
    { id: 4, type: 'Withdrawal', details: 'Bank Transfer', amount: '$2,000.00', date: '2024-06-02' },
];

const TransactionsPage = () => {
    const [filter, setFilter] = useState('All');

    const filteredTransactions = allTransactions.filter(tx => 
        filter === 'All' || tx.type === filter
    );

  return (
    <Card>
        <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <div className="mt-4">
                {['All', 'Buy', 'Sell', 'Deposit', 'Withdrawal'].map(type => (
                    <button 
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-3 py-1 mr-2 rounded-full text-sm ${filter === type ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </CardHeader>
        <CardContent>
            <table className="w-full">
                {/* Table Header */}
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTransactions.map(tx => (
                        <tr key={tx.id} className="text-sm">
                            <td className="py-2">{tx.type}</td>
                            <td className="py-2">{tx.details}</td>
                            <td className="py-2">{tx.amount}</td>
                            <td className="py-2">{tx.date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CardContent>
    </Card>
  );
};

export default TransactionsPage;
