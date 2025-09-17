import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit, 
  TrendingUp, 
  TrendingDown,
  Volume2,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Settings,
  Smartphone,
  Mail,
  MessageSquare
} from 'lucide-react';

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';
  targetPrice: number;
  currentPrice: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'PAUSED';
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  message?: string;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
}

interface VolumeAlert {
  id: string;
  symbol: string;
  condition: 'VOLUME_SPIKE' | 'UNUSUAL_VOLUME' | 'VOLUME_THRESHOLD';
  threshold: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'PAUSED';
  createdAt: string;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
}

interface TechnicalAlert {
  id: string;
  symbol: string;
  indicator: 'RSI' | 'MACD' | 'BOLLINGER_BANDS' | 'MOVING_AVERAGE';
  condition: string;
  value: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'PAUSED';
  createdAt: string;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  frequency: 'IMMEDIATE' | 'BATCHED_5MIN' | 'BATCHED_15MIN' | 'BATCHED_HOURLY';
}

const AlertManagementSystem: React.FC = () => {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [volumeAlerts, setVolumeAlerts] = useState<VolumeAlert[]>([]);
  const [technicalAlerts, setTechnicalAlerts] = useState<TechnicalAlert[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    push: true,
    inApp: true,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    frequency: 'IMMEDIATE'
  });
  
  const [loading, setLoading] = useState(true);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertType, setAlertType] = useState<'PRICE' | 'VOLUME' | 'TECHNICAL'>('PRICE');
  
  // New alert form state
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    condition: '',
    value: 0,
    message: '',
    channels: ['PUSH', 'IN_APP'] as ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[],
    expiresIn: '30' // days
  });

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      // Fetch all alert types
      const [priceResponse, volumeResponse, technicalResponse] = await Promise.all([
        fetch('/api/v1/alerts/price', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/alerts/volume', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/alerts/technical', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (priceResponse.ok) {
        const data = await priceResponse.json();
        setPriceAlerts(data.data || []);
      }

      if (volumeResponse.ok) {
        const data = await volumeResponse.json();
        setVolumeAlerts(data.data || []);
      }

      if (technicalResponse.ok) {
        const data = await technicalResponse.json();
        setTechnicalAlerts(data.data || []);
      }

    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const createAlert = async () => {
    try {
      let endpoint = '';
      let payload = {};

      switch (alertType) {
        case 'PRICE':
          endpoint = '/api/v1/alerts/price';
          payload = {
            symbol: newAlert.symbol,
            condition: newAlert.condition,
            targetPrice: newAlert.value,
            message: newAlert.message,
            channels: newAlert.channels,
            expiresAt: new Date(Date.now() + parseInt(newAlert.expiresIn) * 24 * 60 * 60 * 1000).toISOString()
          };
          break;
        case 'VOLUME':
          endpoint = '/api/v1/alerts/volume';
          payload = {
            symbol: newAlert.symbol,
            condition: newAlert.condition,
            threshold: newAlert.value,
            channels: newAlert.channels
          };
          break;
        case 'TECHNICAL':
          endpoint = '/api/v1/alerts/technical';
          payload = {
            symbol: newAlert.symbol,
            indicator: newAlert.condition,
            value: newAlert.value,
            channels: newAlert.channels
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchAlerts();
        setShowCreateAlert(false);
        setNewAlert({
          symbol: '',
          condition: '',
          value: 0,
          message: '',
          channels: ['PUSH', 'IN_APP'],
          expiresIn: '30'
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const deleteAlert = async (alertId: string, type: 'PRICE' | 'VOLUME' | 'TECHNICAL') => {
    try {
      const endpoint = `/api/v1/alerts/${type.toLowerCase()}/${alertId}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const toggleAlert = async (alertId: string, type: 'PRICE' | 'VOLUME' | 'TECHNICAL', currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const endpoint = `/api/v1/alerts/${type.toLowerCase()}/${alertId}/status`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const updatePreferences = async () => {
    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        // Show success message
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-50 border-green-200';
      case 'TRIGGERED': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PAUSED': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'EXPIRED': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'TRIGGERED': return <Bell className="w-4 h-4" />;
      case 'PAUSED': return <Clock className="w-4 h-4" />;
      case 'EXPIRED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'ABOVE':
      case 'CROSSES_ABOVE': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BELOW':
      case 'CROSSES_BELOW': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground">Create and manage price, volume, and technical alerts</p>
        </div>
        <Button onClick={() => setShowCreateAlert(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Alert
        </Button>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">
                  {[...priceAlerts, ...volumeAlerts, ...technicalAlerts].filter(alert => alert.status === 'ACTIVE').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Triggered Today</p>
                <p className="text-2xl font-bold">
                  {[...priceAlerts, ...volumeAlerts, ...technicalAlerts].filter(alert => 
                    alert.status === 'TRIGGERED' && 
                    alert.triggeredAt && 
                    new Date(alert.triggeredAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Alerts</p>
                <p className="text-2xl font-bold">{priceAlerts.length}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume Alerts</p>
                <p className="text-2xl font-bold">{volumeAlerts.length}</p>
              </div>
              <Volume2 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="price-alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price-alerts">Price Alerts</TabsTrigger>
          <TabsTrigger value="volume-alerts">Volume Alerts</TabsTrigger>
          <TabsTrigger value="technical-alerts">Technical Alerts</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="price-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getConditionIcon(alert.condition)}
                      <div>
                        <p className="font-semibold">{alert.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.condition.replace('_', ' ')} ${alert.targetPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Current: ${alert.currentPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(alert.status)}>
                        {getStatusIcon(alert.status)}
                        <span className="ml-1">{alert.status}</span>
                      </Badge>
                      
                      <div className="flex items-center space-x-1">
                        {alert.channels.includes('EMAIL') && <Mail className="w-4 h-4 text-gray-500" />}
                        {alert.channels.includes('SMS') && <MessageSquare className="w-4 h-4 text-gray-500" />}
                        {alert.channels.includes('PUSH') && <Smartphone className="w-4 h-4 text-gray-500" />}
                      </div>
                      
                      <Switch
                        checked={alert.status === 'ACTIVE'}
                        onCheckedChange={() => toggleAlert(alert.id, 'PRICE', alert.status)}
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAlert(alert.id, 'PRICE')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {priceAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No price alerts configured</p>
                    <Button onClick={() => setShowCreateAlert(true)} className="mt-2">
                      Create Your First Alert
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {volumeAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Volume2 className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-semibold">{alert.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.condition.replace('_', ' ')} - {alert.threshold.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(alert.status)}>
                        {getStatusIcon(alert.status)}
                        <span className="ml-1">{alert.status}</span>
                      </Badge>
                      
                      <Switch
                        checked={alert.status === 'ACTIVE'}
                        onCheckedChange={() => toggleAlert(alert.id, 'VOLUME', alert.status)}
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAlert(alert.id, 'VOLUME')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {volumeAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <Volume2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No volume alerts configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicalAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Settings className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-semibold">{alert.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.indicator} {alert.condition} {alert.value}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(alert.status)}>
                        {getStatusIcon(alert.status)}
                        <span className="ml-1">{alert.status}</span>
                      </Badge>
                      
                      <Switch
                        checked={alert.status === 'ACTIVE'}
                        onCheckedChange={() => toggleAlert(alert.id, 'TECHNICAL', alert.status)}
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAlert(alert.id, 'TECHNICAL')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {technicalAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No technical alerts configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Notification Channels</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>Email Notifications</span>
                    </div>
                    <Switch
                      checked={preferences.email}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>SMS Notifications</span>
                    </div>
                    <Switch
                      checked={preferences.sms}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, sms: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span>Push Notifications</span>
                    </div>
                    <Switch
                      checked={preferences.push}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, push: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4" />
                      <span>In-App Notifications</span>
                    </div>
                    <Switch
                      checked={preferences.inApp}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, inApp: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Quiet Hours</h4>
                
                <div className="flex items-center justify-between">
                  <span>Enable Quiet Hours</span>
                  <Switch
                    checked={preferences.quietHours.enabled}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ 
                        ...prev, 
                        quietHours: { ...prev.quietHours, enabled: checked }
                      }))
                    }
                  />
                </div>
                
                {preferences.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quietStart">Start Time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) => 
                          setPreferences(prev => ({ 
                            ...prev, 
                            quietHours: { ...prev.quietHours, start: e.target.value }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="quietEnd">End Time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) => 
                          setPreferences(prev => ({ 
                            ...prev, 
                            quietHours: { ...prev.quietHours, end: e.target.value }
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Notification Frequency</h4>
                <Select 
                  value={preferences.frequency} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                    <SelectItem value="BATCHED_5MIN">Batched (5 minutes)</SelectItem>
                    <SelectItem value="BATCHED_15MIN">Batched (15 minutes)</SelectItem>
                    <SelectItem value="BATCHED_HOURLY">Batched (Hourly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={updatePreferences} className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Alert Modal */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="alertType">Alert Type</Label>
                <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRICE">Price Alert</SelectItem>
                    <SelectItem value="VOLUME">Volume Alert</SelectItem>
                    <SelectItem value="TECHNICAL">Technical Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={newAlert.symbol}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>

              {alertType === 'PRICE' && (
                <>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={newAlert.condition} onValueChange={(value) => setNewAlert(prev => ({ ...prev, condition: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABOVE">Price Above</SelectItem>
                        <SelectItem value="BELOW">Price Below</SelectItem>
                        <SelectItem value="CROSSES_ABOVE">Crosses Above</SelectItem>
                        <SelectItem value="CROSSES_BELOW">Crosses Below</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetPrice">Target Price</Label>
                    <Input
                      id="targetPrice"
                      type="number"
                      step="0.01"
                      value={newAlert.value}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, value: Number(e.target.value) }))}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="message">Custom Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={newAlert.message}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Alert triggered for..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateAlert(false)}>
                  Cancel
                </Button>
                <Button onClick={createAlert}>
                  Create Alert
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AlertManagementSystem;
