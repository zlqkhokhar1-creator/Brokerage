'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, Text, Group, Badge, Button, SimpleGrid, Progress, RingProgress, Tabs, Select } from '@mantine/core';
import { Bot, Target, TrendingUp, Shield, DollarSign, PieChart, Calendar, Zap } from 'lucide-react';

const portfolioRecommendations = [
  {
    strategy: 'Conservative Growth',
    riskLevel: 'Low',
    expectedReturn: '6-8%',
    timeHorizon: '5+ years',
    allocation: {
      bonds: 60,
      stocks: 30,
      cash: 10
    },
    confidence: 89
  },
  {
    strategy: 'Balanced Growth',
    riskLevel: 'Medium',
    expectedReturn: '8-12%',
    timeHorizon: '3-5 years',
    allocation: {
      bonds: 40,
      stocks: 50,
      cash: 10
    },
    confidence: 92
  },
  {
    strategy: 'Aggressive Growth',
    riskLevel: 'High',
    expectedReturn: '12-18%',
    timeHorizon: '1-3 years',
    allocation: {
      bonds: 20,
      stocks: 70,
      cash: 10
    },
    confidence: 85
  }
];

const goalProgress = [
  {
    goal: 'Emergency Fund',
    target: 25000,
    current: 18750,
    monthly: 625,
    deadline: 'Dec 2024',
    progress: 75
  },
  {
    goal: 'Vacation Fund',
    target: 8000,
    current: 5600,
    monthly: 400,
    deadline: 'Jun 2024',
    progress: 70
  },
  {
    goal: 'Retirement',
    target: 1000000,
    current: 245000,
    monthly: 2500,
    deadline: '2045',
    progress: 24.5
  }
];

const riskProfile = {
  score: 65,
  level: 'Moderate',
  factors: {
    timeHorizon: 75,
    riskTolerance: 60,
    investmentExperience: 70,
    financialSituation: 55
  }
};

const marketTiming = [
  { asset: 'US Stocks', signal: 'Bullish', confidence: 78, timeframe: '3-6 months' },
  { asset: 'Bonds', signal: 'Neutral', confidence: 65, timeframe: '1-3 months' },
  { asset: 'Gold', signal: 'Bullish', confidence: 82, timeframe: '6-12 months' },
  { asset: 'Cryptocurrency', signal: 'Bearish', confidence: 71, timeframe: '1-2 months' }
];

export default function RoboAdvisorPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Robo Advisor"
          description="AI-powered financial planning and portfolio management"
          actions={<Badge color="blue" variant="light" size="lg" leftSection={<Bot className="h-4 w-4" />}>Robo Advisor Active</Badge>}
        />

        {/* Risk Profile Assessment */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Your Risk Profile</Text>
          </Card.Section>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="text-center">
              <RingProgress
                size={150}
                thickness={10}
                sections={[{ value: riskProfile.score, color: riskProfile.score > 70 ? 'red' : riskProfile.score > 50 ? 'yellow' : 'green' }]}
                label={<Text c="white" fw={700} ta="center" size="xl">{riskProfile.score}</Text>}
              />
              <Text size="lg" fw={600} c="white" mt="sm">{riskProfile.level} Risk</Text>
              <Text size="sm" c="dimmed">Based on your assessment</Text>
            </div>

            <div className="space-y-3">
              {Object.entries(riskProfile.factors).map(([factor, score]) => (
                <div key={factor}>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="white">{factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
                    <Text size="sm" c="white">{score}%</Text>
                  </Group>
                  <Progress value={score} color="blue" size="sm" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="portfolio" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="portfolio">Portfolio Recommendations</Tabs.Tab>
            <Tabs.Tab value="goals">Goal Planning</Tabs.Tab>
            <Tabs.Tab value="timing">Market Timing</Tabs.Tab>
            <Tabs.Tab value="rebalancing">Rebalancing</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="portfolio" pt="xl">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {portfolioRecommendations.map((rec) => (
                  <Card key={rec.strategy} shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="text-center mb-4">
                      <Text size="lg" fw={600} c="white">{rec.strategy}</Text>
                      <Badge
                        color={
                          rec.riskLevel === 'Low' ? 'green' :
                          rec.riskLevel === 'Medium' ? 'yellow' : 'red'
                        }
                        variant="light"
                        mt="xs"
                      >
                        {rec.riskLevel} Risk
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <Text size="sm" c="dimmed">Expected Return</Text>
                        <Text size="lg" fw={600} c="green">{rec.expectedReturn}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">Time Horizon</Text>
                        <Text size="sm" c="white">{rec.timeHorizon}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">AI Confidence</Text>
                        <Text size="sm" c="blue">{rec.confidence}%</Text>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Text size="sm" c="dimmed" mb="xs">Asset Allocation</Text>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Stocks</span>
                          <span>{rec.allocation.stocks}%</span>
                        </div>
                        <Progress value={rec.allocation.stocks} color="green" size="sm" />

                        <div className="flex justify-between text-xs">
                          <span>Bonds</span>
                          <span>{rec.allocation.bonds}%</span>
                        </div>
                        <Progress value={rec.allocation.bonds} color="blue" size="sm" />

                        <div className="flex justify-between text-xs">
                          <span>Cash</span>
                          <span>{rec.allocation.cash}%</span>
                        </div>
                        <Progress value={rec.allocation.cash} color="yellow" size="sm" />
                      </div>
                    </div>

                    <Button color="green" fullWidth>
                      Apply Strategy
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="goals" pt="xl">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goalProgress.map((goal) => (
                  <Card key={goal.goal} shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="flex items-center justify-between mb-4">
                      <Text size="lg" fw={600} c="white">{goal.goal}</Text>
                      <Badge color="blue" variant="light">{goal.progress}%</Badge>
                    </div>

                    <div className="mb-4">
                      <Progress value={goal.progress} color="green" size="lg" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Text size="sm" c="dimmed">Current</Text>
                        <Text size="lg" fw={600} c="white">${goal.current.toLocaleString()}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">Target</Text>
                        <Text size="lg" fw={600} c="white">${goal.target.toLocaleString()}</Text>
                      </div>
                    </div>

                    <Group justify="space-between" mb="sm">
                      <Text size="sm" c="dimmed">Monthly Contribution</Text>
                      <Text size="sm" c="green">${goal.monthly}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Deadline</Text>
                      <Text size="sm" c="white">{goal.deadline}</Text>
                    </Group>

                    <Button variant="outline" color="green" fullWidth mt="md">
                      Adjust Goal
                    </Button>
                  </Card>
                ))}
              </div>

              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">AI Goal Recommendations</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="p-4 border border-green-700 rounded bg-green-900/20">
                    <Text size="sm" fw={500} c="green" mb="xs">Recommended: Increase Emergency Fund</Text>
                    <Text size="xs" c="dimmed">Based on your risk profile, consider building a larger emergency fund for better financial security.</Text>
                  </div>

                  <div className="p-4 border border-blue-700 rounded bg-blue-900/20">
                    <Text size="sm" fw={500} c="blue" mb="xs">Suggestion: Diversify Retirement Investments</Text>
                    <Text size="xs" c="dimmed">Consider adding international funds and bonds to your retirement portfolio for better diversification.</Text>
                  </div>
                </div>
              </Card>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="timing" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">AI Market Timing Signals</Text>
              </Card.Section>

              <SimpleGrid cols={2} spacing="md" mt="md">
                {marketTiming.map((signal) => (
                  <Card key={signal.asset} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <Group justify="space-between" mb="xs">
                      <Text size="lg" fw={600} c="white">{signal.asset}</Text>
                      <Badge
                        color={
                          signal.signal === 'Bullish' ? 'green' :
                          signal.signal === 'Bearish' ? 'red' : 'yellow'
                        }
                        variant="light"
                      >
                        {signal.signal}
                      </Badge>
                    </Group>

                    <Group justify="space-between" mb="sm">
                      <Text size="sm" c="dimmed">Confidence</Text>
                      <Text size="sm" c="blue">{signal.confidence}%</Text>
                    </Group>

                    <Text size="xs" c="dimmed">Timeframe: {signal.timeframe}</Text>

                    <Button
                      size="xs"
                      color={
                        signal.signal === 'Bullish' ? 'green' :
                        signal.signal === 'Bearish' ? 'red' : 'yellow'
                      }
                      mt="sm"
                      fullWidth
                    >
                      {signal.signal === 'Bullish' ? 'Consider Buying' :
                       signal.signal === 'Bearish' ? 'Consider Selling' : 'Monitor'}
                    </Button>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="rebalancing" pt="xl">
            <div className="space-y-6">
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Portfolio Rebalancing Recommendations</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="p-4 border border-yellow-700 rounded bg-yellow-900/20">
                    <Text size="sm" fw={500} c="yellow" mb="xs">Rebalancing Needed</Text>
                    <Text size="xs" c="dimmed">Your portfolio has drifted from target allocations. Consider rebalancing to maintain your risk profile.</Text>
                    <Button size="xs" color="yellow" mt="sm">
                      View Rebalancing Plan
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border border-gray-700 rounded">
                      <Text size="sm" c="dimmed">Current Allocation</Text>
                      <Text size="lg" fw={600} c="white">Tech: 45%</Text>
                      <Text size="xs" c="dimmed">Target: 35%</Text>
                    </div>
                    <div className="text-center p-4 border border-gray-700 rounded">
                      <Text size="sm" c="dimmed">Suggested Action</Text>
                      <Text size="lg" fw={600} c="yellow">Reduce 10%</Text>
                      <Text size="xs" c="dimmed">Sell overweight positions</Text>
                    </div>
                    <div className="text-center p-4 border border-gray-700 rounded">
                      <Text size="sm" c="dimmed">Expected Impact</Text>
                      <Text size="lg" fw={600} c="green">+2.3%</Text>
                      <Text size="xs" c="dimmed">Risk reduction</Text>
                    </div>
                  </div>
                </div>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Tax Optimization Suggestions</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="p-4 border border-green-700 rounded bg-green-900/20">
                    <Text size="sm" fw={500} c="green" mb="xs">Tax Loss Harvesting Opportunity</Text>
                    <Text size="xs" c="dimmed">Consider selling positions with losses to offset capital gains tax. Potential tax savings: $2,450</Text>
                    <Button size="xs" color="green" mt="sm">
                      Review Tax Strategy
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}