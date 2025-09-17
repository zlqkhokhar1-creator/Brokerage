'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, SimpleGrid, Progress, RingProgress, Tabs } from '@mantine/core';
import { Brain, TrendingUp, TrendingDown, Shield, Target, Zap, BarChart3, AlertTriangle } from 'lucide-react';

const aiPredictions = [
  {
    symbol: 'AAPL',
    prediction: 'Bullish',
    confidence: 87,
    timeframe: '1-3 months',
    reasoning: 'Strong earnings, AI integration momentum',
    currentPrice: 175.43,
    predictedPrice: 210.50
  },
  {
    symbol: 'TSLA',
    prediction: 'Bullish',
    confidence: 92,
    timeframe: '2-6 months',
    reasoning: 'EV market leadership, autonomous driving progress',
    currentPrice: 245.67,
    predictedPrice: 320.80
  },
  {
    symbol: 'NVDA',
    prediction: 'Bullish',
    confidence: 95,
    timeframe: '1-2 months',
    reasoning: 'AI chip demand surge, data center growth',
    currentPrice: 432.12,
    predictedPrice: 520.30
  }
];

const riskAssessment = {
  overallRisk: 65,
  marketRisk: 72,
  sectorRisk: 58,
  volatilityRisk: 68,
  liquidityRisk: 45
};

const aiSignals = [
  { type: 'BUY', symbol: 'AAPL', strength: 'Strong', reason: 'Technical breakout confirmed' },
  { type: 'SELL', symbol: 'META', strength: 'Medium', reason: 'Overbought conditions' },
  { type: 'HOLD', symbol: 'MSFT', strength: 'Strong', reason: 'Stable growth trajectory' },
  { type: 'BUY', symbol: 'NVDA', strength: 'Strong', reason: 'AI momentum accelerating' }
];

const sentimentData = [
  { source: 'News', sentiment: 78, trend: 'positive' },
  { source: 'Social Media', sentiment: 65, trend: 'positive' },
  { source: 'Analyst Reports', sentiment: 82, trend: 'positive' },
  { source: 'Options Flow', sentiment: 71, trend: 'neutral' }
];

export default function AIDashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Dashboard</h1>
            <p className="text-gray-400 mt-1">Intelligent insights and AI-powered trading recommendations</p>
          </div>
          <Badge color="blue" variant="light" size="lg" leftSection={<Brain className="h-4 w-4" />}>
            AI Active
          </Badge>
        </div>

        {/* AI Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <Target className="h-5 w-5 text-green-400" />
              <div>
                <Text size="lg" fw={700} c="white">87%</Text>
                <Text size="xs" c="dimmed">Prediction Accuracy</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <Zap className="h-5 w-5 text-blue-400" />
              <div>
                <Text size="lg" fw={700} c="white">1,247</Text>
                <Text size="xs" c="dimmed">Signals Generated</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <Shield className="h-5 w-5 text-purple-400" />
              <div>
                <Text size="lg" fw={700} c="white">Low</Text>
                <Text size="xs" c="dimmed">Risk Assessment</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <BarChart3 className="h-5 w-5 text-orange-400" />
              <div>
                <Text size="lg" fw={700} c="white">+15.3%</Text>
                <Text size="xs" c="dimmed">AI Alpha</Text>
              </div>
            </Group>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Predictions */}
          <div className="lg:col-span-2">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">AI Market Predictions</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                {aiPredictions.map((prediction) => (
                  <Card key={prediction.symbol} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-600 rounded flex items-center justify-center">
                          <span className="text-white font-bold">{prediction.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <Text size="lg" fw={600} c="white">{prediction.symbol}</Text>
                          <Text size="sm" c="dimmed">{prediction.timeframe}</Text>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          color={prediction.prediction === 'Bullish' ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                          mb="xs"
                        >
                          {prediction.prediction}
                        </Badge>
                        <Text size="sm" c="white">${prediction.currentPrice} → ${prediction.predictedPrice}</Text>
                        <Text size="xs" c="dimmed">{prediction.confidence}% confidence</Text>
                      </div>
                    </div>

                    <Text size="sm" c="dimmed" mt="sm">
                      {prediction.reasoning}
                    </Text>
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* Risk Assessment */}
          <div>
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Risk Assessment</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                <div className="text-center">
                  <RingProgress
                    size={120}
                    thickness={8}
                    sections={[{ value: riskAssessment.overallRisk, color: riskAssessment.overallRisk > 70 ? 'red' : riskAssessment.overallRisk > 50 ? 'yellow' : 'green' }]}
                    label={<Text c="white" fw={700} ta="center" size="xl">{riskAssessment.overallRisk}%</Text>}
                  />
                  <Text size="sm" c="dimmed" mt="sm">Overall Risk Level</Text>
                </div>

                <div className="space-y-3">
                  {Object.entries(riskAssessment).slice(1).map(([key, value]) => (
                    <div key={key}>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" c="white">{key.replace('Risk', '')}</Text>
                        <Text size="sm" c={value > 70 ? 'red' : value > 50 ? 'yellow' : 'green'}>
                          {value}%
                        </Text>
                      </Group>
                      <Progress
                        value={value}
                        color={value > 70 ? 'red' : value > 50 ? 'yellow' : 'green'}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="signals" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="signals">Trading Signals</Tabs.Tab>
            <Tabs.Tab value="sentiment">Market Sentiment</Tabs.Tab>
            <Tabs.Tab value="patterns">Pattern Recognition</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="signals" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">AI Trading Signals</Text>
              </Card.Section>

              <SimpleGrid cols={2} spacing="md" mt="md">
                {aiSignals.map((signal, index) => (
                  <Card key={index} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <Group justify="space-between" mb="xs">
                      <Badge
                        color={
                          signal.type === 'BUY' ? 'green' :
                          signal.type === 'SELL' ? 'red' : 'yellow'
                        }
                        variant="light"
                      >
                        {signal.type}
                      </Badge>
                      <Badge
                        color={
                          signal.strength === 'Strong' ? 'green' :
                          signal.strength === 'Medium' ? 'yellow' : 'gray'
                        }
                        variant="outline"
                        size="sm"
                      >
                        {signal.strength}
                      </Badge>
                    </Group>

                    <Text size="lg" fw={600} c="white">{signal.symbol}</Text>
                    <Text size="sm" c="dimmed">{signal.reason}</Text>

                    <Button
                      size="xs"
                      color={signal.type === 'BUY' ? 'green' : signal.type === 'SELL' ? 'red' : 'yellow'}
                      mt="sm"
                      fullWidth
                    >
                      {signal.type === 'BUY' ? 'Execute Buy' :
                       signal.type === 'SELL' ? 'Execute Sell' : 'Monitor'}
                    </Button>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="sentiment" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Market Sentiment Analysis</Text>
              </Card.Section>

              <SimpleGrid cols={2} spacing="md" mt="md">
                {sentimentData.map((item) => (
                  <Card key={item.source} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <Text size="sm" fw={500} c="white" mb="sm">{item.source}</Text>

                    <div className="flex items-center gap-3 mb-2">
                      <Progress value={item.sentiment} color="blue" size="lg" style={{ flex: 1 }} />
                      <Text size="sm" c="white">{item.sentiment}%</Text>
                    </div>

                    <Badge
                      color={
                        item.trend === 'positive' ? 'green' :
                        item.trend === 'negative' ? 'red' : 'yellow'
                      }
                      variant="light"
                      size="sm"
                    >
                      {item.trend}
                    </Badge>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="patterns" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Pattern Recognition</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                {[
                  { pattern: 'Double Bottom', symbol: 'AAPL', confidence: 89, timeframe: 'Daily' },
                  { pattern: 'Head & Shoulders', symbol: 'META', confidence: 76, timeframe: 'Weekly' },
                  { pattern: 'Cup & Handle', symbol: 'NVDA', confidence: 82, timeframe: 'Daily' },
                  { pattern: 'Ascending Triangle', symbol: 'TSLA', confidence: 91, timeframe: '4H' }
                ].map((pattern, index) => (
                  <Card key={index} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Text size="lg" fw={600} c="white">{pattern.pattern}</Text>
                        <Text size="sm" c="dimmed">{pattern.symbol} • {pattern.timeframe}</Text>
                      </div>
                      <div className="text-right">
                        <Text size="sm" c="green" fw={500}>{pattern.confidence}% confidence</Text>
                        <Button size="xs" color="blue" mt="xs">
                          View Chart
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}