'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FeatureGate } from '@/components/features/FeatureGate';
import { Card, Text, Button, Group, Badge, Progress, Alert } from '@mantine/core';
import { TrendingUp, Brain, BarChart3, Users, BookOpen, Crown } from 'lucide-react';

export default function FeaturesDemoPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Features Demo</h1>
            <p className="text-gray-400 mt-1">See how feature gating works across different membership tiers</p>
          </div>
          <Badge color="blue" variant="light" size="lg">
            Demo Mode
          </Badge>
        </div>

        <Alert icon={<Crown className="h-4 w-4" />} title="Demo Notice" color="blue" variant="light">
          This page demonstrates the feature gating system. Features are controlled by your membership tier.
          Try changing the mock user tier in the API to see different access levels.
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Predictions Feature */}
          <FeatureGate
            feature="ai_predictions"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <Brain className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">AI Market Predictions</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    Get real-time AI-powered market predictions and insights
                  </Text>
                  <Badge color="purple" variant="light">Premium Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-8 w-8 text-purple-400" />
                <div>
                  <Text size="lg" fw={600} c="white">AI Market Predictions</Text>
                  <Text size="sm" c="dimmed">Real-time AI insights</Text>
                </div>
                <Badge color="green" variant="light">Active</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Today's Prediction</Text>
                  <Badge color="green" variant="light">BUY</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Confidence Level</Text>
                  <Text size="sm" c="green">85%</Text>
                </div>
                <Progress value={85} color="green" size="sm" />
              </div>

              <Button fullWidth mt="md" color="purple">
                View Full Analysis
              </Button>
            </Card>
          </FeatureGate>

          {/* Advanced Charts Feature */}
          <FeatureGate
            feature="advanced_charts"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">Advanced Charts</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    Technical indicators and professional charting tools
                  </Text>
                  <Badge color="blue" variant="light">Basic+ Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-8 w-8 text-blue-400" />
                <div>
                  <Text size="lg" fw={600} c="white">Advanced Charts</Text>
                  <Text size="sm" c="dimmed">Technical analysis tools</Text>
                </div>
                <Badge color="green" variant="light">Active</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">SMA(20)</Text>
                  <Text size="sm" c="blue">$152.30</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">RSI(14)</Text>
                  <Text size="sm" c="orange">67.5</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">MACD</Text>
                  <Text size="sm" c="green">+1.23</Text>
                </div>
              </div>

              <Button fullWidth mt="md" color="blue">
                Open Chart
              </Button>
            </Card>
          </FeatureGate>

          {/* Unlimited Trading Feature */}
          <FeatureGate
            feature="unlimited_trades"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">Unlimited Trading</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    No daily trade limits - trade as much as you want
                  </Text>
                  <Badge color="green" variant="light">Premium Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-green-400" />
                <div>
                  <Text size="lg" fw={600} c="white">Unlimited Trading</Text>
                  <Text size="sm" c="dimmed">No daily limits</Text>
                </div>
                <Badge color="green" variant="light">Active</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Today's Trades</Text>
                  <Text size="sm" c="white">47</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Success Rate</Text>
                  <Text size="sm" c="green">73%</Text>
                </div>
                <Progress value={73} color="green" size="sm" />
              </div>

              <Button fullWidth mt="md" color="green">
                Start Trading
              </Button>
            </Card>
          </FeatureGate>

          {/* Social Trading Feature */}
          <FeatureGate
            feature="social_trading"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <Users className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">Social Trading</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    Copy trades from successful traders in our community
                  </Text>
                  <Badge color="orange" variant="light">Premium Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8 text-orange-400" />
                <div>
                  <Text size="lg" fw={600} c="white">Social Trading</Text>
                  <Text size="sm" c="dimmed">Copy top traders</Text>
                </div>
                <Badge color="green" variant="light">Active</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Following</Text>
                  <Text size="sm" c="white">12 traders</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Avg Performance</Text>
                  <Text size="sm" c="green">+15.2%</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Your Copy Gain</Text>
                  <Text size="sm" c="green">+$2,340</Text>
                </div>
              </div>

              <Button fullWidth mt="md" color="orange">
                Browse Traders
              </Button>
            </Card>
          </FeatureGate>

          {/* Personal Coaching Feature */}
          <FeatureGate
            feature="personal_coaching"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <BookOpen className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">Personal Coaching</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    1-on-1 coaching sessions with expert traders
                  </Text>
                  <Badge color="yellow" variant="light">VIP Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-8 w-8 text-teal-400" />
                <div>
                  <Text size="lg" fw={600} c="white">Personal Coaching</Text>
                  <Text size="sm" c="dimmed">Expert guidance</Text>
                </div>
                <Badge color="yellow" variant="light">VIP</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Next Session</Text>
                  <Text size="sm" c="white">Tomorrow 2 PM</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Coach</Text>
                  <Text size="sm" c="teal">Sarah Johnson</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Sessions Used</Text>
                  <Text size="sm" c="white">3/10</Text>
                </div>
              </div>

              <Button fullWidth mt="md" color="teal">
                Join Session
              </Button>
            </Card>
          </FeatureGate>

          {/* Futures Trading Feature */}
          <FeatureGate
            feature="futures_trading"
            fallback={
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <Text size="lg" fw={600} c="white" mb="sm">Futures Trading</Text>
                  <Text size="sm" c="dimmed" mb="md">
                    Advanced futures contracts trading platform
                  </Text>
                  <Badge color="red" variant="light">VIP Feature</Badge>
                </div>
              </Card>
            }
          >
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-red-400" />
                <div>
                  <Text size="lg" fw={600} c="white">Futures Trading</Text>
                  <Text size="sm" c="dimmed">Advanced derivatives</Text>
                </div>
                <Badge color="red" variant="light">VIP</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Open Positions</Text>
                  <Text size="sm" c="white">5</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Total P&L</Text>
                  <Text size="sm" c="green">+$12,450</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="sm" c="white">Margin Used</Text>
                  <Text size="sm" c="white">68%</Text>
                </div>
              </div>

              <Button fullWidth mt="md" color="red">
                Trade Futures
              </Button>
            </Card>
          </FeatureGate>
        </div>

        {/* Usage Statistics */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Feature Usage Statistics</Text>
          </Card.Section>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Text size="2xl" fw={700} c="green">47</Text>
                <Text size="sm" c="dimmed">AI Predictions Used Today</Text>
                <Progress value={47} color="green" size="sm" mt="xs" />
              </div>
              <div className="text-center">
                <Text size="2xl" fw={700} c="blue">120</Text>
                <Text size="sm" c="dimmed">Charts Viewed Today</Text>
                <Progress value={24} color="blue" size="sm" mt="xs" />
              </div>
              <div className="text-center">
                <Text size="2xl" fw={700} c="orange">15</Text>
                <Text size="sm" c="dimmed">Trades Executed Today</Text>
                <Progress value={15} color="orange" size="sm" mt="xs" />
              </div>
            </div>
          </div>
        </Card>

        {/* Feature Gate Code Example */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">How to Use Feature Gates</Text>
          </Card.Section>

          <div className="mt-4">
            <Text size="sm" c="dimmed" mb="md">
              Wrap any component with FeatureGate to control access based on membership tier:
            </Text>
            <div className="bg-gray-800 p-4 rounded-md font-mono text-sm text-green-400">
              {`<FeatureGate feature="ai_predictions">
  <AIDashboard />
</FeatureGate>`}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}