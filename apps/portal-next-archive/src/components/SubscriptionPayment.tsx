"use client";
/**
 * 💳 SUBSCRIPTION PAYMENT COMPONENT
 * 
 * Handles premium brokerage plan subscription payments during signup
 * Integrates with multiple payment providers (Stripe, PayPal, etc.)
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { 
  CreditCard, 
  Shield, 
  Check, 
  Star, 
  Zap, 
  Crown,
  Lock,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { type ComponentType } from 'react';

type IconType = ComponentType<{ className?: string }>;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  savings?: string;
  icon?: IconType;
  description?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: IconType;
  description: string;
}

interface SubscriptionPaymentProps {
  selectedPlan?: SubscriptionPlan;
  onPaymentSuccess: (subscriptionData: any) => void;
  onCancel: () => void;
  className?: string;
}

export function SubscriptionPayment({ 
  selectedPlan, 
  onPaymentSuccess, 
  onCancel,
  className = ''
}: SubscriptionPaymentProps) {
  // 📋 SUBSCRIPTION PLANS WITH DUMMY DATA
  const plans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basic Trader',
      price: 0,
      billingCycle: 'monthly',
      icon: Zap,
      description: 'Perfect for beginners',
      features: [
        'Commission-free stock trading',
        'Basic market data (15-min delay)',
        'Mobile & web app access',
        'Standard customer support',
        'Basic portfolio analytics',
        'Market news & insights'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Trader',
      price: 29.99,
      billingCycle: 'monthly',
      icon: Star,
      description: 'For active traders',
      features: [
        'Everything in Basic',
        '🤖 Advanced AI trading insights',
        '📊 Real-time market data',
        '📈 Options & futures trading',
        '⚡ Priority customer support',
        '📋 Advanced charting tools',
        '🎯 Custom alerts & notifications',
        '📱 Premium mobile features'
      ],
      popular: true
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 99.99,
      billingCycle: 'monthly',
      icon: Crown,
      description: 'For serious investors',
      features: [
        'Everything in Premium',
        '🚀 Quantum portfolio optimization',
        '🛰️ Alternative data intelligence',
        '🧠 Behavioral finance advisor',
        '👨‍💼 Dedicated account manager',
        '🔌 API access for algorithms',
        '⚠️ Advanced risk management',
        '🌐 International markets access',
        '📊 Institutional-grade analytics'
      ]
    },
    {
      id: 'premium-yearly',
      name: 'Premium (Yearly)',
      price: 299.99,
      billingCycle: 'yearly',
      icon: Sparkles,
      description: 'Best value - Save 17%',
      features: [
        'Everything in Premium',
        '🤖 Advanced AI trading insights',
        '📊 Real-time market data',
        '📈 Options & futures trading',
        '⚡ Priority customer support',
        '📋 Advanced charting tools',
        '🎯 Custom alerts & notifications',
        '📱 Premium mobile features'
      ],
      savings: 'Save 17% ($60/year)'
    }
  ];

  // 💳 PAYMENT METHODS
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express'
    }
  ];

  // 🎯 STATE MANAGEMENT
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(
    selectedPlan || plans.find(p => p.popular) || plans[0]
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'plan' | 'payment'>('plan');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
    zip: ''
  });
  const [billingAddress, setBillingAddress] = useState({
    address: '',
    city: '',
    state: '',
    country: 'US',
    zip: ''
  });

  // 💰 CALCULATE PRICING
  const calculateTotal = () => {
    const subtotal = currentPlan.price;
    const tax = subtotal * 0.08; // 8% tax
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  // 🔄 HANDLE PAYMENT PROCESSING
  const handlePayment = async () => {
    if (!agreesToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    if (currentPlan.price === 0) {
      // Free plan - no payment needed
      onPaymentSuccess({
        planId: currentPlan.id,
        subscriptionId: `free_${Date.now()}`,
        status: 'active',
        planName: currentPlan.name,
        nextBillingDate: null
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing with dummy data
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Dummy payment data for simulation
      const paymentData = {
        planId: currentPlan.id,
        amount: calculateTotal().total,
        paymentMethod: selectedPaymentMethod,
        cardDetails: {
          ...cardDetails,
          number: '****-****-****-' + cardDetails.number.slice(-4)
        },
        billingAddress: billingAddress
      };

      // Simulate successful payment response
      const mockResponse = {
        subscriptionId: `sub_${Date.now()}`,
        customerId: `cus_${Date.now()}`,
        paymentIntentId: `pi_${Date.now()}`,
        status: 'active',
        nextBillingDate: new Date(
          Date.now() + (currentPlan.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        planName: currentPlan.name,
        amount: calculateTotal().total
      };

      // Call payment success callback with dummy data
      onPaymentSuccess({
        ...mockResponse,
        planId: currentPlan.id
      });

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🎨 RENDER PLAN SELECTION
  const renderPlanSelection = () => (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choose Your Trading Plan
        </h1>
        <p className="text-lg text-muted-foreground">
          Unlock the power of AI-driven trading with our revolutionary brokerage platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon || Star;
          return (
            <Card 
              key={plan.id}
              className={`relative transition-all duration-200 hover:shadow-lg flex flex-col h-full ${
                currentPlan.id === plan.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              } ${plan.popular ? 'border-2 border-primary' : ''}`}
              onClick={() => setCurrentPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {plan.savings && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    {plan.savings}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${plan.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {plan.price === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No credit card required
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 flex-grow flex flex-col">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-auto pt-4">
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPlan(plan);
                      setPaymentStep('payment');
                    }}
                  >
                    {currentPlan.id === plan.id ? 'Selected' : 'Select Plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // 💳 RENDER PAYMENT FORM
  const renderPaymentForm = () => (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => setPaymentStep('plan')}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Plans
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <Icon className="w-6 h-6" />
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPaymentMethod === 'stripe' && (
                <div className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setCardDetails({...cardDetails, number: value});
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setCardDetails({...cardDetails, expiry: value});
                        }}
                        className="mt-1"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={cardDetails.cvc}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCardDetails({...cardDetails, cvc: value});
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardDetails.name}
                      onChange={(e) => 
                        setCardDetails({...cardDetails, name: e.target.value})
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="12345"
                      value={cardDetails.zip}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setCardDetails({...cardDetails, zip: value});
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <h3 className="font-semibold mb-3">Billing Address</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St"
                      value={billingAddress.address}
                      onChange={(e) => 
                        setBillingAddress({...billingAddress, address: e.target.value})
                      }
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="New York"
                        value={billingAddress.city}
                        onChange={(e) => 
                          setBillingAddress({...billingAddress, city: e.target.value})
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        placeholder="NY"
                        value={billingAddress.state}
                        onChange={(e) => 
                          setBillingAddress({...billingAddress, state: e.target.value})
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zip">ZIP / Postal Code</Label>
                      <Input
                        id="zip"
                        placeholder="12345"
                        value={billingAddress.zip}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setBillingAddress({...billingAddress, zip: value});
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <select
                        id="country"
                        value={billingAddress.country}
                        onChange={(e) => 
                          setBillingAddress({...billingAddress, country: e.target.value})
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="JP">Japan</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  {currentPlan.icon ? (
                    <currentPlan.icon className="w-6 h-6 text-primary" />
                  ) : (
                    <Star className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{currentPlan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.billingCycle === 'yearly' ? 'Yearly Billing' : 'Monthly Billing'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${calculateTotal().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${calculateTotal().tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>${calculateTotal().total.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreesToTerms}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        setAgreesToTerms(checked);
                      }
                    }}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none"
                  >
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary hover:underline font-medium">
                      Privacy Policy
                    </a>
                    . I understand that my subscription will automatically renew and I can cancel anytime.
                  </Label>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">Secure Payment</p>
                  <p className="text-green-600">256-bit SSL encryption & PCI compliance</p>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full h-12 text-base font-semibold"
                disabled={
                  isProcessing || 
                  !agreesToTerms || 
                  (currentPlan.price > 0 && !cardDetails.number) ||
                  (currentPlan.price > 0 && !cardDetails.expiry) ||
                  (currentPlan.price > 0 && !cardDetails.cvc) ||
                  (currentPlan.price > 0 && !cardDetails.name)
                }
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {currentPlan.price === 0 
                      ? 'Start Free Plan' 
                      : `Pay $${calculateTotal().total.toFixed(2)}`
                    }
                  </>
                )}
              </Button>

              {currentPlan.price === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No payment required. Upgrade anytime.
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3 flex-shrink-0" />
                <span>Your payment information is encrypted and secure</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto p-4 sm:p-6 ${className}`}>
      {paymentStep === 'plan' ? renderPlanSelection() : renderPaymentForm()}
    </div>
  );
}

// Example usage:
/*
<SubscriptionPayment 
  onPaymentSuccess={(data) => {
    console.log('Payment successful:', data);
    // Handle successful subscription
    // Redirect to dashboard or next step
  }}
  onCancel={() => {
    // Handle cancel action
    // Return to previous page or close modal
  }}
/>
*/
