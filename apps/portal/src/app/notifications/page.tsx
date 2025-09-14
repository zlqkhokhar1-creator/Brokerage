"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Settings, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Mail, Smartphone, Globe } from 'lucide-react';

interface Notification {
  id: string;
  type: 'price_alert' | 'order_filled' | 'news' | 'risk_warning' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  symbol?: string;
  actionRequired?: boolean;
}

interface NotificationPreferences {
  email: {
    priceAlerts: boolean;
    orderUpdates: boolean;
    newsAlerts: boolean;
    riskWarnings: boolean;
    systemUpdates: boolean;
  };
  push: {
    priceAlerts: boolean;
    orderUpdates: boolean;
    newsAlerts: boolean;
    riskWarnings: boolean;
    systemUpdates: boolean;
  };
  sms: {
    priceAlerts: boolean;
    orderUpdates: boolean;
    riskWarnings: boolean;
    systemUpdates: boolean;
  };
}

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  currentPrice: number;
  active: boolean;
  created: string;
}

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'alerts' | 'preferences'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'price_alert',
      title: 'AAPL Price Alert',
      message: 'Apple (AAPL) has reached your target price of $175.00',
      timestamp: '2024-09-06T10:30:00Z',
      read: false,
      priority: 'high',
      symbol: 'AAPL',
      actionRequired: false
    },
    {
      id: '2',
      type: 'order_filled',
      title: 'Order Executed',
      message: 'Your market order for 100 shares of MSFT has been filled at $332.50',
      timestamp: '2024-09-06T09:15:00Z',
      read: false,
      priority: 'medium',
      symbol: 'MSFT',
      actionRequired: false
    },
    {
      id: '3',
      type: 'risk_warning',
      title: 'Portfolio Risk Alert',
      message: 'Your portfolio concentration in technology sector exceeds 40%',
      timestamp: '2024-09-06T08:45:00Z',
      read: true,
      priority: 'high',
      actionRequired: true
    },
    {
      id: '4',
      type: 'news',
      title: 'Market News',
      message: 'Federal Reserve announces interest rate decision - Markets react positively',
      timestamp: '2024-09-05T16:00:00Z',
      read: true,
      priority: 'medium',
      actionRequired: false
    }
  ]);

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([
    {
      id: '1',
      symbol: 'AAPL',
      condition: 'above',
      price: 180,
      currentPrice: 175.43,
      active: true,
      created: '2024-09-01T10:00:00Z'
    },
    {
      id: '2',
      symbol: 'TSLA',
      condition: 'below',
      price: 200,
      currentPrice: 245.67,
      active: true,
      created: '2024-08-28T14:30:00Z'
    },
    {
      id: '3',
      symbol: 'MSFT',
      condition: 'above',
      price: 340,
      currentPrice: 332.89,
      active: false,
      created: '2024-08-25T11:15:00Z'
    }
  ]);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      priceAlerts: true,
      orderUpdates: true,
      newsAlerts: false,
      riskWarnings: true,
      systemUpdates: true
    },
    push: {
      priceAlerts: true,
      orderUpdates: true,
      newsAlerts: true,
      riskWarnings: true,
      systemUpdates: false
    },
    sms: {
      priceAlerts: true,
      orderUpdates: true,
      riskWarnings: true,
      systemUpdates: false
    }
  });

  const [newAlert, setNewAlert] = useState({
    symbol: '',
    condition: 'above' as 'above' | 'below',
    price: ''
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_alert': return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'order_filled': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'risk_warning': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'news': return <Globe className="w-5 h-5 text-purple-400" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const createPriceAlert = async () => {
    if (!newAlert.symbol || !newAlert.price) return;

    try {
      const response = await fetch('/api/v1/alerts/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newAlert.symbol.toUpperCase(),
          condition: newAlert.condition,
          targetPrice: parseFloat(newAlert.price)
        })
      });

      if (response.ok) {
        // Add to local state
        const alert: PriceAlert = {
          id: Date.now().toString(),
          symbol: newAlert.symbol.toUpperCase(),
          condition: newAlert.condition,
          price: parseFloat(newAlert.price),
          currentPrice: 0, // Would be fetched from API
          active: true,
          created: new Date().toISOString()
        };
        setPriceAlerts(prev => [alert, ...prev]);
        setNewAlert({ symbol: '', condition: 'above', price: '' });
      }
    } catch (error) {
      console.error('Failed to create price alert:', error);
    }
  };

  const toggleAlert = (id: string) => {
    setPriceAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  };

  const updatePreferences = async () => {
    try {
      await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notification Center</h1>
              <p className="text-gray-400">Manage your alerts and notification preferences</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {unreadCount} unread
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 border-b border-[#1E1E1E]">
          {[
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'alerts', label: 'Price Alerts', icon: TrendingUp },
            { id: 'preferences', label: 'Preferences', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {notifications.map(notification => (
              <Card key={notification.id} className={`bg-[#111111] border-[#1E1E1E] transition-all ${
                !notification.read ? 'border-blue-500/30' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          {notification.symbol && (
                            <Badge variant="outline">{notification.symbol}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                      <p className="text-gray-300 mb-3">{notification.message}</p>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                        {notification.actionRequired && (
                          <Button size="sm">
                            Take Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Price Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New Alert */}
            <Card className="bg-[#111111] border-[#1E1E1E] lg:col-span-1">
              <CardHeader>
                <CardTitle>Create Price Alert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Symbol</label>
                  <Input
                    value={newAlert.symbol}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g., AAPL"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Condition</label>
                  <Select value={newAlert.condition} onValueChange={(value: any) => setNewAlert(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Price goes above</SelectItem>
                      <SelectItem value="below">Price goes below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAlert.price}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={createPriceAlert} className="w-full">
                  Create Alert
                </Button>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card className="bg-[#111111] border-[#1E1E1E] lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Price Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priceAlerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={() => toggleAlert(alert.id)}
                        />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {alert.symbol}
                            <Badge variant="outline">
                              {alert.condition} ${alert.price}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">
                            Current: ${alert.currentPrice} • Created: {formatTimestamp(alert.created)}
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${
                        alert.condition === 'above' 
                          ? alert.currentPrice >= alert.price ? 'text-green-400' : 'text-gray-400'
                          : alert.currentPrice <= alert.price ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {alert.condition === 'above' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-sm">
                          {alert.condition === 'above' 
                            ? alert.currentPrice >= alert.price ? 'Triggered' : 'Waiting'
                            : alert.currentPrice <= alert.price ? 'Triggered' : 'Waiting'
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="max-w-4xl">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Email Notifications */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold">Email Notifications</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(preferences.email).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => setPreferences(prev => ({
                              ...prev,
                              email: { ...prev.email, [key]: checked }
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Smartphone className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-semibold">Push Notifications</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(preferences.push).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => setPreferences(prev => ({
                              ...prev,
                              push: { ...prev.push, [key]: checked }
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Smartphone className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold">SMS Notifications</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(preferences.sms).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => setPreferences(prev => ({
                              ...prev,
                              sms: { ...prev.sms, [key]: checked }
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={updatePreferences} className="w-full">
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
