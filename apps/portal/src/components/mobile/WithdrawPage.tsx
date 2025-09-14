"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowLeft,
  Building2, 
  Shield,
  Clock,
  Check,
  AlertTriangle,
  Wallet,
  DollarSign,
  CreditCard
} from 'lucide-react';

interface WithdrawPageProps {
  onNavigate: (page: string) => void;
}

const savedAccounts = [
  {
    id: '1',
    type: 'Checking',
    bank: 'Chase Bank',
    accountNumber: '****1234',
    isDefault: true
  },
  {
    id: '2',
    type: 'Savings',
    bank: 'Bank of America',
    accountNumber: '****5678',
    isDefault: false
  }
];

const quickAmounts = [100, 500, 1000, 2000];

export function WithdrawPage({ onNavigate }: WithdrawPageProps) {
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(savedAccounts[0].id);
  const [step, setStep] = useState<'amount' | 'confirmation' | 'processing'>('amount');

  const availableBalance = 2847.92;
  const selectedAccountDetails = savedAccounts.find(acc => acc.id === selectedAccount);

  const handleAmountSubmit = () => {
    if (amount && parseFloat(amount) >= 10 && parseFloat(amount) <= availableBalance) {
      setStep('confirmation');
    }
  };

  const handleConfirm = () => {
    setStep('processing');
    // Simulate processing
    setTimeout(() => {
      onNavigate('transactions');
    }, 3000);
  };

  const canWithdraw = parseFloat(amount) >= 10 && parseFloat(amount) <= availableBalance;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Withdraw Funds</h1>
            <p className="text-sm text-muted-foreground">Transfer money to your bank</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {step === 'amount' && (
          <div className="space-y-6">
            {/* Available Balance */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-semibold">${availableBalance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Settled funds available for withdrawal
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Withdrawal Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-3 py-1">
                          <Building2 className="h-4 w-4" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{account.bank} - {account.type}</span>
                              {account.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {account.accountNumber}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Amount Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Withdrawal Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-lg"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="10"
                      max={availableBalance}
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Minimum: $10.00</span>
                    <span>Available: ${availableBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <Label>Quick Select</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(quickAmount.toString())}
                        className="h-10"
                        disabled={quickAmount > availableBalance}
                      >
                        ${quickAmount}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(availableBalance.toString())}
                    className="w-full mt-2"
                  >
                    Withdraw All (${availableBalance.toLocaleString()})
                  </Button>
                </div>

                {/* Fees and Processing Time */}
                <div className="bg-accent/20 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Withdrawal Fee:</span>
                    <span className="text-success font-medium">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Time:</span>
                    <span>1-3 business days</span>
                  </div>
                </div>

                {parseFloat(amount) > availableBalance && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">
                      Withdrawal amount exceeds available balance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={handleAmountSubmit}
              disabled={!canWithdraw}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Withdrawal Amount:</span>
                    <span className="font-semibold">${amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Withdrawal Fee:</span>
                    <span className="text-success">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>You'll Receive:</span>
                    <span>${amount}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Destination Account</h3>
                  <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{selectedAccountDetails?.bank}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAccountDetails?.type} - {selectedAccountDetails?.accountNumber}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Processing Time</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your withdrawal will be processed within 1-3 business days. You'll receive an email confirmation once the transfer is complete.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>All withdrawals are secured with bank-level encryption</span>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleConfirm}>
              Confirm Withdrawal
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Withdrawal Submitted</h2>
                <p className="text-muted-foreground mb-6">
                  Your withdrawal request has been submitted successfully.
                </p>
                
                <div className="bg-accent/20 p-4 rounded-lg text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span className="font-semibold">${amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Destination:</span>
                    <span>{selectedAccountDetails?.bank} {selectedAccountDetails?.accountNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reference ID:</span>
                    <span className="font-mono">WD-{Date.now().toString().slice(-6)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  You'll receive an email confirmation and can track this withdrawal in your transaction history.
                </p>
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={() => onNavigate('transactions')}
            >
              View Transaction History
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}