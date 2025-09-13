import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { 
  ArrowLeft,
  CreditCard, 
  Building2, 
  Smartphone,
  Shield,
  Clock,
  Check,
  AlertCircle,
  Plus,
  Wallet,
  DollarSign
} from 'lucide-react';

interface FundingPageProps {
  onNavigate: (page: string) => void;
}

const paymentMethods = [
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Free • 1-3 business days',
    icon: Building2,
    recommended: true,
    fees: 'Free',
    processingTime: '1-3 business days'
  },
  {
    id: 'card',
    name: 'Debit Card',
    description: 'Instant • Small fee applies',
    icon: CreditCard,
    recommended: false,
    fees: '1.5%',
    processingTime: 'Instant'
  },
  {
    id: 'mobile',
    name: 'Mobile Wallet',
    description: 'Instant • Small fee applies',
    icon: Smartphone,
    recommended: false,
    fees: '2.0%',
    processingTime: 'Instant'
  }
];

const quickAmounts = [100, 500, 1000, 5000];

export function FundingPage({ onNavigate }: FundingPageProps) {
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'method' | 'details' | 'confirmation'>('amount');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const handleAmountSubmit = () => {
    if (amount && parseFloat(amount) >= 10) {
      setStep('method');
    }
  };

  const handleMethodSubmit = () => {
    setStep('details');
  };

  const handleDetailsSubmit = () => {
    setStep('confirmation');
  };

  const handleConfirm = () => {
    // Simulate processing
    setTimeout(() => {
      onNavigate('home');
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Add Funds</h1>
            <p className="text-sm text-muted-foreground">Fund your account securely</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {step === 'amount' && (
          <div className="space-y-6">
            {/* Current Balance */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-semibold">$2,847.92</p>
                  </div>
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amount Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Enter Amount
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
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum deposit: $10.00
                  </p>
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
                      >
                        ${quickAmount}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={handleAmountSubmit}
              disabled={!amount || parseFloat(amount) < 10}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'method' && (
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card className="bg-accent/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Adding to account</p>
                  <p className="text-2xl font-semibold">${amount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Choose Payment Method</Label>
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <Card 
                    key={method.id}
                    className={`cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{method.name}</span>
                            {method.recommended && (
                              <Badge variant="secondary" className="text-xs bg-success/20 text-success">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        {selectedMethod === method.id && (
                          <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button className="w-full" onClick={handleMethodSubmit}>
              Continue with {paymentMethods.find(m => m.id === selectedMethod)?.name}
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6">
            {selectedMethod === 'bank' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Bank Transfer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Transfer Instructions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Account Name:</span>
                        <span className="font-medium">TradePro Securities</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Number:</span>
                        <span className="font-medium">1234567890</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Routing Number:</span>
                        <span className="font-medium">021000021</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">${amount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Please include your account ID (TP-123456) in the transfer memo to ensure proper crediting.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Card Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9000 0000"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails(prev => ({ 
                        ...prev, 
                        number: formatCardNumber(e.target.value) 
                      }))}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails(prev => ({ 
                          ...prev, 
                          expiry: formatExpiry(e.target.value) 
                        }))}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails(prev => ({ 
                          ...prev, 
                          cvv: e.target.value.replace(/\D/g, '') 
                        }))}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails(prev => ({ 
                        ...prev, 
                        name: e.target.value 
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Your payment information is secured with bank-level encryption</span>
            </div>

            <Button className="w-full" onClick={handleDetailsSubmit}>
              Review Payment
            </Button>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-semibold">${amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span>{paymentMethods.find(m => m.id === selectedMethod)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee:</span>
                    <span>{paymentMethods.find(m => m.id === selectedMethod)?.fees}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${amount}</span>
                  </div>
                </div>

                <div className="bg-accent/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Processing Time</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethods.find(m => m.id === selectedMethod)?.processingTime}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleConfirm}>
              Confirm Payment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}