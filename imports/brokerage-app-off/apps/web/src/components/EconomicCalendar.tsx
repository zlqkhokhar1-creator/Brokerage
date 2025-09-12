import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Star,
  Globe,
  Building,
  DollarSign,
  Percent,
  BarChart3,
  Filter
} from 'lucide-react';

interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  date: string;
  time: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'GDP' | 'INFLATION' | 'EMPLOYMENT' | 'INTEREST_RATES' | 'TRADE' | 'MANUFACTURING' | 'CONSUMER' | 'OTHER';
  actual?: number;
  forecast?: number;
  previous?: number;
  unit: string;
  description: string;
  impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'PENDING';
  affectedSectors: string[];
  relatedSymbols: string[];
}

interface EarningsEvent {
  id: string;
  symbol: string;
  companyName: string;
  date: string;
  time: 'BMO' | 'AMC' | 'DMT'; // Before Market Open, After Market Close, During Market Trading
  quarter: string;
  estimatedEPS?: number;
  actualEPS?: number;
  estimatedRevenue?: number;
  actualRevenue?: number;
  marketCap: number;
  sector: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

const EconomicCalendar: React.FC = () => {
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    importance: 'ALL',
    country: 'ALL',
    category: 'ALL'
  });

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate, filters]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Fetch economic events
      const economicResponse = await fetch(`/api/v1/market/economic-calendar?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (economicResponse.ok) {
        const economicData = await economicResponse.json();
        setEconomicEvents(economicData.data || []);
      }

      // Fetch earnings events
      const earningsResponse = await fetch(`/api/v1/market/earnings?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        setEarningsEvents(earningsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM': return <Star className="w-4 h-4" />;
      case 'LOW': return <BarChart3 className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'BULLISH': return 'text-green-600';
      case 'BEARISH': return 'text-red-600';
      case 'NEUTRAL': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'GDP': return <TrendingUp className="w-4 h-4" />;
      case 'INFLATION': return <Percent className="w-4 h-4" />;
      case 'EMPLOYMENT': return <Building className="w-4 h-4" />;
      case 'INTEREST_RATES': return <DollarSign className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getTimeIcon = (time: string) => {
    switch (time) {
      case 'BMO': return '🌅';
      case 'AMC': return '🌙';
      case 'DMT': return '☀️';
      default: return '⏰';
    }
  };

  const filteredEconomicEvents = economicEvents.filter(event => {
    if (filters.importance !== 'ALL' && event.importance !== filters.importance) return false;
    if (filters.country !== 'ALL' && event.country !== filters.country) return false;
    if (filters.category !== 'ALL' && event.category !== filters.category) return false;
    return true;
  });

  const filteredEarningsEvents = earningsEvents.filter(event => {
    if (filters.importance !== 'ALL' && event.importance !== filters.importance) return false;
    return true;
  });

  const countries = [...new Set(economicEvents.map(event => event.country))];
  const categories = [...new Set(economicEvents.map(event => event.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Economic Calendar</h1>
          <p className="text-muted-foreground">Track important economic events and earnings releases</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            {selectedDate.toLocaleDateString()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar and Filters */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Importance</label>
                <Select value={filters.importance} onValueChange={(value) => setFilters(prev => ({ ...prev, importance: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Country</label>
                <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="economic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="economic">Economic Events ({filteredEconomicEvents.length})</TabsTrigger>
              <TabsTrigger value="earnings">Earnings ({filteredEarningsEvents.length})</TabsTrigger>
              <TabsTrigger value="combined">Combined View</TabsTrigger>
            </TabsList>

            <TabsContent value="economic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Economic Events - {selectedDate.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEconomicEvents.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Badge className={getImportanceColor(event.importance)}>
                                {getImportanceIcon(event.importance)}
                                <span className="ml-1">{event.importance}</span>
                              </Badge>
                              <div className="flex items-center space-x-2">
                                <Globe className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{event.country}</span>
                                <span className="text-sm text-muted-foreground">({event.currency})</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{event.time}</span>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center space-x-2 mb-1">
                              {getCategoryIcon(event.category)}
                              <h4 className="font-semibold">{event.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>

                          {(event.actual !== undefined || event.forecast !== undefined || event.previous !== undefined) && (
                            <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-gray-50 rounded">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Previous</p>
                                <p className="font-semibold">{event.previous !== undefined ? `${event.previous}${event.unit}` : 'N/A'}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Forecast</p>
                                <p className="font-semibold">{event.forecast !== undefined ? `${event.forecast}${event.unit}` : 'N/A'}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Actual</p>
                                <p className={`font-semibold ${getImpactColor(event.impact)}`}>
                                  {event.actual !== undefined ? `${event.actual}${event.unit}` : 'Pending'}
                                </p>
                              </div>
                            </div>
                          )}

                          {event.affectedSectors.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-muted-foreground mb-1">Affected Sectors:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.affectedSectors.map((sector, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">{sector}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {event.relatedSymbols.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Related Symbols:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.relatedSymbols.map((symbol, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">{symbol}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {filteredEconomicEvents.length === 0 && !loading && (
                        <div className="text-center py-8">
                          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-muted-foreground">No economic events scheduled for this date</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Releases - {selectedDate.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {['BMO', 'DMT', 'AMC'].map(timeSlot => {
                        const timeEvents = filteredEarningsEvents.filter(event => event.time === timeSlot);
                        if (timeEvents.length === 0) return null;

                        return (
                          <div key={timeSlot}>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <span className="text-lg">{getTimeIcon(timeSlot)}</span>
                              {timeSlot === 'BMO' ? 'Before Market Open' : 
                               timeSlot === 'AMC' ? 'After Market Close' : 
                               'During Market Trading'}
                            </h4>
                            
                            <div className="space-y-3">
                              {timeEvents.map((event) => (
                                <div key={event.id} className="p-4 border rounded-lg">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-semibold text-lg">{event.symbol}</h4>
                                        <Badge className={getImportanceColor(event.importance)}>
                                          {event.importance}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{event.companyName}</p>
                                      <p className="text-xs text-muted-foreground">{event.sector} • ${(event.marketCap / 1000000000).toFixed(1)}B Market Cap</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium">{event.quarter}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Earnings Per Share</p>
                                      <div className="flex justify-between">
                                        <span className="text-sm">Est: ${event.estimatedEPS?.toFixed(2) || 'N/A'}</span>
                                        <span className="text-sm font-semibold">
                                          Act: {event.actualEPS !== undefined ? `$${event.actualEPS.toFixed(2)}` : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                                      <div className="flex justify-between">
                                        <span className="text-sm">Est: ${event.estimatedRevenue ? (event.estimatedRevenue / 1000000000).toFixed(1) + 'B' : 'N/A'}</span>
                                        <span className="text-sm font-semibold">
                                          Act: {event.actualRevenue !== undefined ? `$${(event.actualRevenue / 1000000000).toFixed(1)}B` : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {filteredEarningsEvents.length === 0 && !loading && (
                        <div className="text-center py-8">
                          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-muted-foreground">No earnings releases scheduled for this date</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="combined" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Events - {selectedDate.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Timeline view combining both economic and earnings events */}
                      {[...filteredEconomicEvents.map(e => ({ ...e, type: 'economic' })), 
                        ...filteredEarningsEvents.map(e => ({ ...e, type: 'earnings' }))]
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((event, index) => (
                          <div key={`${event.type}-${event.id}`} className="flex items-start space-x-4 p-4 border rounded-lg">
                            <div className="flex-shrink-0 w-16 text-center">
                              <p className="text-sm font-medium">{event.time}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {event.type === 'economic' ? 'ECON' : 'EARN'}
                              </Badge>
                            </div>
                            
                            <div className="flex-1">
                              {event.type === 'economic' ? (
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-semibold">{(event as any).title}</h4>
                                    <Badge className={getImportanceColor((event as any).importance)} variant="outline">
                                      {(event as any).importance}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{(event as any).country} • {(event as any).currency}</p>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-semibold">{(event as any).symbol} Earnings</h4>
                                    <Badge className={getImportanceColor((event as any).importance)} variant="outline">
                                      {(event as any).importance}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{(event as any).companyName}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                      {filteredEconomicEvents.length === 0 && filteredEarningsEvents.length === 0 && !loading && (
                        <div className="text-center py-8">
                          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-muted-foreground">No events scheduled for this date</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EconomicCalendar;
