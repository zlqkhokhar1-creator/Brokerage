import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download
} from 'lucide-react';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  totalVolume: number;
  systemUptime: number;
  apiLatency: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface UserManagement {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  kycStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  accountValue: number;
  lastLogin: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  tradingPermissions: string[];
}

interface ComplianceIssue {
  id: string;
  userId: string;
  type: 'PATTERN_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'REGULATORY_BREACH' | 'KYC_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  assignedTo?: string;
}

interface TradingActivity {
  symbol: string;
  totalVolume: number;
  totalTrades: number;
  averageSize: number;
  topTraders: { userId: string; volume: number; pnl: number }[];
  suspiciousActivity: number;
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [tradingActivity, setTradingActivity] = useState<TradingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch system metrics
      const metricsResponse = await fetch('/api/v1/system/performance', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      // Fetch user management data
      const usersResponse = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data || []);
      }

      // Fetch compliance issues
      const complianceResponse = await fetch('/api/v1/compliance/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json();
        setComplianceIssues(complianceData.data.issues || []);
      }

      // Fetch trading activity
      const tradingResponse = await fetch('/api/v1/admin/trading-activity', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (tradingResponse.ok) {
        const tradingData = await tradingResponse.json();
        setTradingActivity(tradingData.data || []);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchAdminData();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const resolveComplianceIssue = async (issueId: string, resolution: string) => {
    try {
      const response = await fetch(`/api/v1/compliance/issues/${issueId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ resolution })
      });

      if (response.ok) {
        await fetchAdminData();
      }
    } catch (error) {
      console.error('Error resolving compliance issue:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'RESOLVED': return 'text-green-600 bg-green-50 border-green-200';
      case 'PENDING':
      case 'INVESTIGATING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'SUSPENDED':
      case 'REJECTED':
      case 'OPEN': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System monitoring and user management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAdminData}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* System Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+{metrics.activeUsers} active</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Daily Volume</p>
                  <p className="text-2xl font-bold">${(metrics.totalVolume / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-green-600">{metrics.totalTrades.toLocaleString()} trades</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                  <p className="text-2xl font-bold">{metrics.systemUptime.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">{metrics.apiLatency}ms avg latency</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground">CPU: {metrics.cpuUsage}%</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${metrics.errorRate > 0.01 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="trading">Trading Activity</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Account Value</p>
                        <p className="font-semibold">${user.accountValue.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <Badge className={getStatusColor(user.status)} variant="outline">
                          {user.status}
                        </Badge>
                        <Badge className={getStatusColor(user.kycStatus)} variant="outline">
                          KYC: {user.kycStatus}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Select onValueChange={(value) => updateUserStatus(user.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Actions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Activate</SelectItem>
                            <SelectItem value="SUSPENDED">Suspend</SelectItem>
                            <SelectItem value="PENDING_VERIFICATION">Verify</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceIssues.map((issue) => (
                  <div key={issue.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">{issue.type.replace('_', ' ')}</Badge>
                        <Badge className={getStatusColor(issue.status)} variant="outline">
                          {issue.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm mb-3">{issue.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        User ID: {issue.userId}
                        {issue.assignedTo && ` • Assigned to: ${issue.assignedTo}`}
                      </div>
                      
                      {issue.status === 'OPEN' && (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => resolveComplianceIssue(issue.id, 'INVESTIGATING')}>
                            Investigate
                          </Button>
                          <Button size="sm" onClick={() => resolveComplianceIssue(issue.id, 'RESOLVED')}>
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {complianceIssues.length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No compliance issues</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tradingActivity.map((activity, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{activity.symbol}</h4>
                      {activity.suspiciousActivity > 0 && (
                        <Badge className="text-red-600 bg-red-50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {activity.suspiciousActivity} alerts
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Volume</p>
                        <p className="font-semibold">${activity.totalVolume.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Trades</p>
                        <p className="font-semibold">{activity.totalTrades.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Trade Size</p>
                        <p className="font-semibold">${activity.averageSize.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Top Traders</p>
                      <div className="space-y-1">
                        {activity.topTraders.slice(0, 3).map((trader, traderIndex) => (
                          <div key={traderIndex} className="flex justify-between text-sm">
                            <span>User {trader.userId.slice(-6)}</span>
                            <span>${trader.volume.toLocaleString()}</span>
                            <span className={trader.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {trader.pnl >= 0 ? '+' : ''}${trader.pnl.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {tradingActivity.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No trading activity data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>API Latency</span>
                    <span className="font-semibold">{metrics.apiLatency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate</span>
                    <span className={`font-semibold ${metrics.errorRate > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {(metrics.errorRate * 100).toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>System Uptime</span>
                    <span className="font-semibold text-green-600">{metrics.systemUptime.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>CPU Usage</span>
                    <span className={`font-semibold ${metrics.cpuUsage > 80 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.cpuUsage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <span className={`font-semibold ${metrics.memoryUsage > 80 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.memoryUsage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Connections</span>
                    <span className="font-semibold">{metrics.activeUsers.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.errorRate > 0.01 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Error rate is above normal threshold ({(metrics.errorRate * 100).toFixed(3)}%)
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {metrics.cpuUsage > 80 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          High CPU usage detected ({metrics.cpuUsage}%)
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {metrics.memoryUsage > 80 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          High memory usage detected ({metrics.memoryUsage}%)
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {metrics.errorRate <= 0.01 && metrics.cpuUsage <= 80 && metrics.memoryUsage <= 80 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          All systems operating normally
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                User Details: {selectedUser.name}
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="font-semibold">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedUser.status)}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <Label>KYC Status</Label>
                  <Badge className={getStatusColor(selectedUser.kycStatus)}>
                    {selectedUser.kycStatus}
                  </Badge>
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Badge className={getSeverityColor(selectedUser.riskLevel)}>
                    {selectedUser.riskLevel}
                  </Badge>
                </div>
                <div>
                  <Label>Account Value</Label>
                  <p className="font-semibold">${selectedUser.accountValue.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <p className="font-semibold">{new Date(selectedUser.lastLogin).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label>Trading Permissions</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedUser.tradingPermissions.map((permission, index) => (
                    <Badge key={index} variant="outline">{permission}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
