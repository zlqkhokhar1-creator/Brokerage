import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowLeft,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Check,
  AlertCircle,
  Building2,
  CreditCard,
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react';

interface TransactionsPageProps {
  onNavigate: (page: string) => void;
}

type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'dividend' | 'fee';
type TransactionStatus = 'completed' | 'pending' | 'failed';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  status: TransactionStatus;
  date: string;
  symbol?: string;
  method?: string;
  reference?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'deposit',
    description: 'Bank Transfer Deposit',
    amount: 1000.00,
    status: 'completed',
    date: '2024-01-15T10:30:00Z',
    method: 'Bank Transfer',
    reference: 'DEP-2024011501'
  },
  {
    id: '2',
    type: 'trade',
    description: 'Buy AAPL - 10 shares',
    amount: -1750.50,
    status: 'completed',
    date: '2024-01-14T14:22:00Z',
    symbol: 'AAPL',
    reference: 'TRD-2024011401'
  },
  {
    id: '3',
    type: 'dividend',
    description: 'MSFT Dividend Payment',
    amount: 25.60,
    status: 'completed',
    date: '2024-01-12T09:00:00Z',
    symbol: 'MSFT',
    reference: 'DIV-2024011201'
  },
  {
    id: '4',
    type: 'withdrawal',
    description: 'Bank Transfer Withdrawal',
    amount: -500.00,
    status: 'pending',
    date: '2024-01-11T16:45:00Z',
    method: 'Bank Transfer',
    reference: 'WD-2024011101'
  },
  {
    id: '5',
    type: 'trade',
    description: 'Sell TSLA - 5 shares',
    amount: 1225.75,
    status: 'completed',
    date: '2024-01-10T11:18:00Z',
    symbol: 'TSLA',
    reference: 'TRD-2024011002'
  },
  {
    id: '6',
    type: 'fee',
    description: 'Monthly Account Fee',
    amount: -9.99,
    status: 'completed',
    date: '2024-01-01T00:00:00Z',
    reference: 'FEE-2024010101'
  },
  {
    id: '7',
    type: 'deposit',
    description: 'Card Deposit',
    amount: 250.00,
    status: 'failed',
    date: '2023-12-28T13:22:00Z',
    method: 'Debit Card',
    reference: 'DEP-2023122801'
  }
];

export function TransactionsPage({ onNavigate }: TransactionsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTransactionIcon = (type: TransactionType, amount: number) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'trade':
        return amount > 0 ? 
          <ArrowDownLeft className="h-4 w-4 text-success" /> : 
          <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'dividend':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'fee':
        return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-success/20 text-success">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalByType = (type: TransactionType) => {
    return filteredTransactions
      .filter(t => t.type === type && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Transaction History</h1>
              <p className="text-sm text-muted-foreground">View all your transactions</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Total Deposits</span>
              </div>
              <p className="text-lg font-semibold text-success">
                +${getTotalByType('deposit').toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Total Withdrawals</span>
              </div>
              <p className="text-lg font-semibold text-destructive">
                -${getTotalByType('withdrawal').toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="trade">Trades</SelectItem>
                  <SelectItem value="dividend">Dividends</SelectItem>
                  <SelectItem value="fee">Fees</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No transactions found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="transition-colors hover:bg-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center">
                      {getTransactionIcon(transaction.type, transaction.amount)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{transaction.description}</span>
                        {transaction.symbol && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.symbol}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(transaction.date)}</span>
                        {transaction.reference && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{transaction.reference}</span>
                          </>
                        )}
                      </div>
                      {transaction.method && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          {transaction.method.includes('Bank') ? (
                            <Building2 className="h-3 w-3" />
                          ) : (
                            <CreditCard className="h-3 w-3" />
                          )}
                          <span>{transaction.method}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-semibold ${
                        transaction.amount > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                      </div>
                      <div className="mt-1">
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full">
              Load More Transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}