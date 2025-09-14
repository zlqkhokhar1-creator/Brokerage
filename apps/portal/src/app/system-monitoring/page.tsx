"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Server, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu, 
  HardDrive, 
  Wifi,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Globe,
  BarChart3,
  RefreshCw,
  Bell
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  responseTime: number;
  lastCheck: string;
  incidents: number;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  service: string;
  resolved: boolean;
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
  activeUsers: number;
  trades: number;
}

export default function SystemMonitoringPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchSystemMetrics();
    fetchServiceStatus();
    fetchAlerts();
    fetchPerformanceData();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      fetchSystemMetrics();
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    // Mock API call - replace with actual backend call
    // const response = await fetch('/api/v1/monitoring/metrics');
    
    const mockMetrics: SystemMetric[] = [
      {
        id: 'cpu',
        name: 'CPU Usage',
        value: 68.5,
        unit: '%',
        status: 'warning',
        threshold: { warning: 70, critical: 90 },
        trend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'memory',
        name: 'Memory Usage',
        value: 45.2,
        unit: '%',
        status: 'healthy',
        threshold: { warning: 80, critical: 95 },
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'disk',
        name: 'Disk Usage',
        value: 23.8,
        unit: '%',
        status: 'healthy',
        threshold: { warning: 80, critical: 95 },
        trend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'network',
        name: 'Network I/O',
        value: 89.3,
        unit: 'Mbps',
        status: 'healthy',
        threshold: { warning: 900, critical: 1000 },
        trend: 'down',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'response_time',
        name: 'API Response Time',
        value: 245,
        unit: 'ms',
        status: 'healthy',
        threshold: { warning: 500, critical: 1000 },
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'active_connections',
        name: 'Active Connections',
        value: 1247,
        unit: 'conn',
        status: 'healthy',
        threshold: { warning: 5000, critical: 8000 },
        trend: 'up',
        lastUpdated: new Date().toISOString()
      }
    ];

    setMetrics(mockMetrics);
  };

  const fetchServiceStatus = async () => {
    const mockServices: ServiceStatus[] = [
      {
        id: 'api_gateway',
        name: 'API Gateway',
        status: 'online',
        uptime: 99.98,
        responseTime: 89,
        lastCheck: new Date().toISOString(),
        incidents: 0
      },
      {
        id: 'trading_engine',
        name: 'Trading Engine',
        status: 'online',
        uptime: 99.95,
        responseTime: 156,
        lastCheck: new Date().toISOString(),
        incidents: 1
      },
      {
        id: 'market_data',
        name: 'Market Data Service',
        status: 'degraded',
        uptime: 97.82,
        responseTime: 445,
        lastCheck: new Date().toISOString(),
        incidents: 3
      },
      {
        id: 'user_auth',
        name: 'Authentication Service',
        status: 'online',
        uptime: 99.99,
        responseTime: 67,
        lastCheck: new Date().toISOString(),
        incidents: 0
      },
      {
        id: 'notification',
        name: 'Notification Service',
        status: 'online',
        uptime: 99.91,
        responseTime: 234,
        lastCheck: new Date().toISOString(),
        incidents: 2
      },
      {
        id: 'database',
        name: 'Primary Database',
        status: 'online',
        uptime: 99.97,
        responseTime: 12,
        lastCheck: new Date().toISOString(),
        incidents: 0
      }
    ];

    setServices(mockServices);
  };

  const fetchAlerts = async () => {
    const mockAlerts: SystemAlert[] = [
      {
        id: '1',
        type: 'warning',
        message: 'CPU usage approaching 70% threshold',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        service: 'api_gateway',
        resolved: false
      },
      {
        id: '2',
        type: 'error',
        message: 'Market data service experiencing high latency',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        service: 'market_data',
        resolved: false
      },
      {
        id: '3',
        type: 'info',
        message: 'Scheduled maintenance completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        service: 'database',
        resolved: true
      },
      {
        id: '4',
        type: 'warning',
        message: 'High number of failed login attempts detected',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        service: 'user_auth',
        resolved: true
      }
    ];

    setAlerts(mockAlerts);
  };

  const fetchPerformanceData = async () => {
    // Generate mock time series data for the last 24 hours
    const now = new Date();
    const data: PerformanceData[] = [];
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toISOString(),
        cpu: Math.random() * 40 + 30 + Math.sin(i / 4) * 10, // Simulate daily patterns
        memory: Math.random() * 20 + 40,
        disk: Math.random() * 10 + 20,
        network: Math.random() * 200 + 50,
        responseTime: Math.random() * 100 + 150,
        activeUsers: Math.random() * 500 + 800 + Math.sin(i / 6) * 200,
        trades: Math.random() * 1000 + 500 + Math.sin(i / 8) * 300
      });
    }

    setPerformanceData(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'online': return 'bg-green-500/20 text-green-400';
      case 'warning': case 'degraded': return 'bg-yellow-500/20 text-yellow-400';
      case 'critical': case 'offline': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'warning': case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': case 'offline': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-orange-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-blue-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const refreshData = () => {
    setLoading(true);
    fetchSystemMetrics();
    fetchServiceStatus();
    fetchAlerts();
    fetchPerformanceData();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-400" />
          <p className="text-lg">Loading system monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold mb-2">System Monitoring</h1>
                <p className="text-gray-400">Real-time system health and performance monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <Button onClick={refreshData} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="services">Service Status</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts & Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.map((metric) => (
                <Card key={metric.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{metric.name}</h3>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <Badge className={getStatusColor(metric.status)}>
                        {getStatusIcon(metric.status)}
                        {metric.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-3xl font-bold">
                        {metric.value.toFixed(metric.unit === 'ms' || metric.unit === 'conn' ? 0 : 1)}
                        <span className="text-lg text-gray-400 ml-1">{metric.unit}</span>
                      </div>
                      
                      <Progress 
                        value={metric.unit === '%' ? metric.value : 
                               metric.unit === 'ms' ? Math.min((metric.value / metric.threshold.critical) * 100, 100) :
                               metric.unit === 'conn' ? Math.min((metric.value / metric.threshold.critical) * 100, 100) :
                               Math.min((metric.value / 1000) * 100, 100)} 
                        className="h-2"
                      />
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Warning: {metric.threshold.warning}{metric.unit}</span>
                        <span>Critical: {metric.threshold.critical}{metric.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* System Health Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Service Health Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Online', value: services.filter(s => s.status === 'online').length, color: '#10B981' },
                            { name: 'Degraded', value: services.filter(s => s.status === 'degraded').length, color: '#F59E0B' },
                            { name: 'Offline', value: services.filter(s => s.status === 'offline').length, color: '#EF4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Online', value: services.filter(s => s.status === 'online').length, color: '#10B981' },
                            { name: 'Degraded', value: services.filter(s => s.status === 'degraded').length, color: '#F59E0B' },
                            { name: 'Offline', value: services.filter(s => s.status === 'offline').length, color: '#EF4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Online ({services.filter(s => s.status === 'online').length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Degraded ({services.filter(s => s.status === 'degraded').length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Offline ({services.filter(s => s.status === 'offline').length})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Recent System Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {alerts.slice(0, 4).map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 border border-[#1E1E1E] rounded-lg">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>{alert.service}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(alert.timestamp)}</span>
                            {alert.resolved && (
                              <>
                                <span>•</span>
                                <Badge className="bg-green-500/20 text-green-400 text-xs">Resolved</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Server className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-gray-400">Last check: {formatTimeAgo(service.lastCheck)}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(service.status)}>
                        {getStatusIcon(service.status)}
                        {service.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Uptime</span>
                        <span className="font-semibold">{formatUptime(service.uptime)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Response Time</span>
                        <span className="font-semibold">{service.responseTime}ms</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Incidents (24h)</span>
                        <span className={`font-semibold ${service.incidents > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {service.incidents}
                        </span>
                      </div>
                      
                      <Progress value={service.uptime} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* CPU and Memory Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>CPU & Memory Usage (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#6B7280"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: '8px' }}
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                        />
                        <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} dot={false} name="CPU %" />
                        <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} dot={false} name="Memory %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Response Time & Network (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#6B7280"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: '8px' }}
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                        />
                        <Line type="monotone" dataKey="responseTime" stroke="#F59E0B" strokeWidth={2} dot={false} name="Response Time (ms)" />
                        <Line type="monotone" dataKey="network" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Network (Mbps)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Activity and Trading Volume */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Active Users (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#6B7280"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: '8px' }}
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                        />
                        <Area type="monotone" dataKey="activeUsers" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Trading Volume (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#6B7280"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: '8px' }}
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                        />
                        <Bar dataKey="trades" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-[#111111] border-[#1E1E1E]">
                  <CardHeader>
                    <CardTitle>System Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <Alert key={alert.id} className={`border ${
                          alert.type === 'error' ? 'border-red-500/20 bg-red-500/5' :
                          alert.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' :
                          'border-blue-500/20 bg-blue-500/5'
                        }`}>
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <AlertDescription className="font-medium">
                                {alert.message}
                              </AlertDescription>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                <Badge variant="outline" className="text-xs">
                                  {alert.service}
                                </Badge>
                                <span>{formatTimeAgo(alert.timestamp)}</span>
                                {alert.resolved && (
                                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-[#111111] border-[#1E1E1E]">
                  <CardHeader>
                    <CardTitle>Alert Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm">Critical</span>
                      </div>
                      <span className="font-semibold">{alerts.filter(a => a.type === 'error' && !a.resolved).length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">Warning</span>
                      </div>
                      <span className="font-semibold">{alerts.filter(a => a.type === 'warning' && !a.resolved).length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">Info</span>
                      </div>
                      <span className="font-semibold">{alerts.filter(a => a.type === 'info').length}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-[#1E1E1E]">
                      <Button className="w-full" variant="outline">
                        <Bell className="w-4 h-4 mr-2" />
                        Configure Alerts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
