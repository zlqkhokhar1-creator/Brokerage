'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Card,
  Text,
  Group,
  Badge,
  Button,
  Switch,
  Table,
  Select,
  Tabs,
  Loader,
  Alert,
  NumberInput,
  TextInput,
  Modal,
  Stack,
  Divider,
  Progress,
  RingProgress,
  SimpleGrid
} from '@mantine/core';
import {
  Settings,
  Users,
  TrendingUp,
  Shield,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  BarChart3
} from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_active: boolean;
  tier_availability: Array<{
    tier: string;
    tier_display_name: string;
    enabled: boolean;
    limits: Record<string, any>;
  }>;
}

interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  user_count: number;
}

interface AnalyticsData {
  usageByTier: Array<{
    tier_name: string;
    feature_name: string;
    users_using: number;
    avg_usage: number;
    total_usage: number;
  }>;
  revenueImpact: Array<{
    tier_name: string;
    user_count: number;
    paying_users: number;
    potential_revenue: number;
  }>;
}

export default function FeatureManagementPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('premium');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [limitValues, setLimitValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API, but use fallback if it fails
      let featuresData, tiersData, analyticsData;

      try {
        const featuresRes = await fetch('/api/admin/features');
        featuresData = await featuresRes.json();
      } catch (apiError) {
        console.warn('API not available, using demo data');
        // Fallback demo data
        featuresData = {
          features: [
            {
              id: 'ai_predictions',
              name: 'ai_predictions',
              display_name: 'AI Market Predictions',
              description: 'Real-time AI-powered market predictions',
              category: 'ai',
              is_active: true,
              tier_availability: [
                { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
                { tier: 'basic', tier_display_name: 'Basic', enabled: true, limits: { api_calls_per_day: 100 } },
                { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: { api_calls_per_day: 1000 } },
                { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: { api_calls_per_day: 5000 } }
              ]
            },
            {
              id: 'advanced_charts',
              name: 'advanced_charts',
              display_name: 'Advanced Charts',
              description: 'Technical indicators and advanced charting',
              category: 'analytics',
              is_active: true,
              tier_availability: [
                { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
                { tier: 'basic', tier_display_name: 'Basic', enabled: true, limits: {} },
                { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: {} },
                { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: {} }
              ]
            }
          ],
          tiers: [
            { id: 'free', name: 'free', display_name: 'Free', price_monthly: 0, price_yearly: 0, user_count: 1250 },
            { id: 'basic', name: 'basic', display_name: 'Basic', price_monthly: 9.99, price_yearly: 99.99, user_count: 850 },
            { id: 'premium', name: 'premium', display_name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, user_count: 320 },
            { id: 'vip', name: 'vip', display_name: 'VIP', price_monthly: 99.99, price_yearly: 999.99, user_count: 45 }
          ],
          totalFeatures: 2,
          totalTiers: 4
        };
      }

      // Mock analytics data
      analyticsData = {
        usageByTier: [
          { tier_name: 'premium', feature_name: 'ai_predictions', users_using: 45, avg_usage: 85, total_usage: 3825 },
          { tier_name: 'basic', feature_name: 'advanced_charts', users_using: 120, avg_usage: 67, total_usage: 8040 }
        ],
        revenueImpact: [
          { tier_name: 'premium', user_count: 320, paying_users: 320, potential_revenue: 9599.99 },
          { tier_name: 'basic', user_count: 850, paying_users: 850, potential_revenue: 8499.99 }
        ]
      };

      setFeatures(featuresData.features);
      setTiers(featuresData.tiers);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Unable to load feature data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (featureId: string, tierName: string, enabled: boolean) => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId, tierName, enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle feature');
      }

      const result = await response.json();

      // Update local state
      setFeatures(prev => prev.map(feature =>
        feature.id === featureId
          ? {
              ...feature,
              tier_availability: feature.tier_availability.map(ta =>
                ta.tier === tierName ? { ...ta, enabled } : ta
              )
            }
          : feature
      ));

      // Show success message (you can add a toast notification here)
      console.log(result.message);

    } catch (err) {
      console.error('Error toggling feature:', err);
      setError('Failed to toggle feature');
    } finally {
      setSaving(false);
    }
  };

  const handleLimitsUpdate = async () => {
    if (!selectedFeature) return;

    try {
      setSaving(true);

      const response = await fetch('/api/admin/features/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: selectedFeature.id,
          tierName: selectedTier,
          limits: limitValues
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update limits');
      }

      // Update local state
      setFeatures(prev => prev.map(feature =>
        feature.id === selectedFeature.id
          ? {
              ...feature,
              tier_availability: feature.tier_availability.map(ta =>
                ta.tier === selectedTier ? { ...ta, limits: limitValues } : ta
              )
            }
          : feature
      ));

      setLimitsModalOpen(false);
      setSelectedFeature(null);
      setLimitValues({});

    } catch (err) {
      console.error('Error updating limits:', err);
      setError('Failed to update limits');
    } finally {
      setSaving(false);
    }
  };

  const openLimitsModal = (feature: Feature) => {
    setSelectedFeature(feature);
    const currentLimits = feature.tier_availability.find(ta => ta.tier === selectedTier)?.limits || {};
    setLimitValues(currentLimits);
    setLimitsModalOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trading': return <TrendingUp size={16} />;
      case 'ai': return <Shield size={16} />;
      case 'analytics': return <BarChart3 size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trading': return 'blue';
      case 'ai': return 'purple';
      case 'analytics': return 'green';
      case 'social': return 'orange';
      case 'education': return 'teal';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert icon={<AlertTriangle size={16} />} title="Error" color="red" variant="light">
          {error}
          <Button variant="light" color="red" size="xs" mt="sm" onClick={loadData}>
            Retry
          </Button>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Feature Management</h1>
            <p className="text-gray-400 mt-1">Control feature availability across membership tiers</p>
          </div>
          <Badge color="blue" variant="light" size="lg">
            Admin Panel
          </Badge>
        </div>

        <Tabs defaultValue="features" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="features">Feature Toggles</Tabs.Tab>
            <Tabs.Tab value="tiers">Tier Management</Tabs.Tab>
            <Tabs.Tab value="analytics">Usage Analytics</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="features" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="mb-4">
                <Select
                  label="Select Membership Tier"
                  placeholder="Choose tier to manage"
                  data={tiers.map(tier => ({
                    value: tier.name,
                    label: `${tier.display_name} (${tier.user_count} users)`
                  }))}
                  value={selectedTier}
                  onChange={(value) => value && setSelectedTier(value)}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />
              </div>

              <div className="space-y-4">
                {features.map((feature) => {
                  const tierAvailability = feature.tier_availability.find(ta => ta.tier === selectedTier);
                  const isEnabled = tierAvailability?.enabled || false;

                  return (
                    <Card key={feature.id} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(feature.category)}
                            <Text size="lg" fw={600} c="white">{feature.display_name}</Text>
                            <Badge color={getCategoryColor(feature.category)} variant="light" size="sm">
                              {feature.category}
                            </Badge>
                          </div>
                          <Text size="sm" c="dimmed" mb="xs">{feature.description}</Text>

                          {/* Show current limits */}
                          {tierAvailability?.limits && Object.keys(tierAvailability.limits).length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {Object.entries(tierAvailability.limits).map(([key, value]) => (
                                <Badge key={key} variant="outline" size="xs" color="blue">
                                  {key}: {value}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <Switch
                            checked={isEnabled}
                            onChange={(event) =>
                              handleFeatureToggle(feature.id, selectedTier, event.currentTarget.checked)
                            }
                            color="green"
                            size="md"
                            disabled={saving}
                          />

                          <Button
                            variant="outline"
                            size="sm"
                            color="blue"
                            leftSection={<Edit size={14} />}
                            onClick={() => openLimitsModal(feature)}
                            disabled={!isEnabled}
                          >
                            Limits
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button color="green" size="lg" loading={saving}>
                  Save All Changes
                </Button>
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="tiers" pt="xl">
            <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
              {tiers.map((tier) => (
                <Card key={tier.id} shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <div className="text-center">
                    <Crown className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <Text size="lg" fw={600} c="white" mb="xs">{tier.display_name}</Text>
                    <Text size="sm" c="dimmed" mb="md">
                      ${tier.price_monthly}/month
                    </Text>
                    <div className="flex items-center justify-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <Text size="sm" c="gray">{tier.user_count} users</Text>
                    </div>
                  </div>
                </Card>
              ))}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="xl">
            {analytics && (
              <div className="space-y-6">
                {/* Revenue Impact */}
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg" c="white">Revenue Impact</Text>
                  </Card.Section>

                  <div className="mt-4 space-y-4">
                    {analytics.revenueImpact.map((impact) => (
                      <div key={impact.tier_name} className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                        <div>
                          <Text size="sm" fw={600} c="white">{impact.tier_name.toUpperCase()}</Text>
                          <Text size="xs" c="dimmed">{impact.user_count} users</Text>
                        </div>
                        <div className="text-right">
                          <Text size="sm" c="green">${impact.potential_revenue.toLocaleString()}/month</Text>
                          <Text size="xs" c="dimmed">{impact.paying_users} paying users</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Feature Usage */}
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg" c="white">Feature Usage by Tier</Text>
                  </Card.Section>

                  <div className="mt-4">
                    <Table striped highlightOnHover withTableBorder>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ color: 'white' }}>Tier</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Feature</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Users Using</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Avg Usage</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Total Usage</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {analytics.usageByTier.map((usage, index) => (
                          <Table.Tr key={index}>
                            <Table.Td style={{ color: 'white' }}>{usage.tier_name}</Table.Td>
                            <Table.Td style={{ color: 'white' }}>{usage.feature_name}</Table.Td>
                            <Table.Td style={{ color: 'white' }}>{usage.users_using}</Table.Td>
                            <Table.Td style={{ color: 'white' }}>{Math.round(usage.avg_usage)}</Table.Td>
                            <Table.Td style={{ color: 'white' }}>{usage.total_usage}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}
          </Tabs.Panel>
        </Tabs>

        {/* Limits Configuration Modal */}
        <Modal
          opened={limitsModalOpen}
          onClose={() => setLimitsModalOpen(false)}
          title={`Configure Limits - ${selectedFeature?.display_name}`}
          size="md"
          styles={{
            content: { backgroundColor: '#1a1a1a' },
            header: { backgroundColor: '#1a1a1a', color: 'white' },
            body: { color: 'white' }
          }}
        >
          <Stack>
            <TextInput
              label="Max Portfolio Size ($)"
              placeholder="100000"
              value={limitValues.max_portfolio_size || ''}
              onChange={(event) => setLimitValues(prev => ({
                ...prev,
                max_portfolio_size: parseInt(event.currentTarget.value) || 0
              }))}
              type="number"
            />

            <NumberInput
              label="API Calls Per Day"
              placeholder="1000"
              value={limitValues.api_calls_per_day || 0}
              onChange={(value) => setLimitValues(prev => ({
                ...prev,
                api_calls_per_day: typeof value === 'number' ? value : 0
              }))}
              min={0}
            />

            <NumberInput
              label="Max Watchlists"
              placeholder="10"
              value={limitValues.max_watchlists || 0}
              onChange={(value) => setLimitValues(prev => ({
                ...prev,
                max_watchlists: typeof value === 'number' ? value : 0
              }))}
              min={0}
            />

            <Divider />

            <Group justify="flex-end">
              <Button variant="outline" onClick={() => setLimitsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLimitsUpdate} loading={saving}>
                Save Limits
              </Button>
            </Group>
          </Stack>
        </Modal>
      </div>
    </DashboardLayout>
  );
}