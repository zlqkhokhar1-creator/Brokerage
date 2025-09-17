'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, SimpleGrid, Tabs, Progress } from '@mantine/core';
import { BookOpen, Play, FileText, Award, TrendingUp, BarChart3, Users, Star } from 'lucide-react';

const learningPaths = [
  {
    title: 'Stock Market Basics',
    description: 'Learn the fundamentals of stock trading and investing',
    progress: 75,
    modules: 12,
    completed: 9,
    difficulty: 'Beginner',
    duration: '4 hours'
  },
  {
    title: 'Technical Analysis',
    description: 'Master chart patterns, indicators, and trading strategies',
    progress: 45,
    modules: 15,
    completed: 7,
    difficulty: 'Intermediate',
    duration: '6 hours'
  },
  {
    title: 'Portfolio Management',
    description: 'Build and manage diversified investment portfolios',
    progress: 30,
    modules: 10,
    completed: 3,
    difficulty: 'Advanced',
    duration: '5 hours'
  }
];

const featuredCourses = [
  {
    title: 'Understanding Market Cycles',
    instructor: 'Dr. Sarah Johnson',
    rating: 4.8,
    students: 12543,
    duration: '2.5 hours',
    level: 'Intermediate',
    price: 'Free'
  },
  {
    title: 'Options Trading Strategies',
    instructor: 'Mike Chen',
    rating: 4.9,
    students: 8921,
    duration: '3 hours',
    level: 'Advanced',
    price: '$49'
  },
  {
    title: 'Cryptocurrency Investing',
    instructor: 'Alex Rivera',
    rating: 4.7,
    students: 15678,
    duration: '2 hours',
    level: 'Beginner',
    price: '$29'
  }
];

const marketInsights = [
  {
    title: 'Federal Reserve Policy Impact',
    type: 'Analysis',
    readTime: '5 min',
    author: 'Economic Team',
    views: 15420
  },
  {
    title: 'Tech Sector Outlook 2024',
    type: 'Report',
    readTime: '8 min',
    author: 'Research Team',
    views: 12340
  },
  {
    title: 'Risk Management Strategies',
    type: 'Guide',
    readTime: '6 min',
    author: 'Risk Team',
    views: 9876
  }
];

const achievements = [
  { name: 'First Trade', description: 'Complete your first trade', earned: true },
  { name: 'Portfolio Builder', description: 'Create a diversified portfolio', earned: true },
  { name: 'Market Analyst', description: 'Complete 10 market analysis', earned: false },
  { name: 'Risk Manager', description: 'Implement risk management strategies', earned: false }
];

export default function EducationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Education</h1>
            <p className="text-gray-400 mt-1">Learn, grow, and master your investment skills on Invest Pro</p>
          </div>
          <Button leftSection={<BookOpen className="h-4 w-4" />}>
            My Learning
          </Button>
        </div>

        {/* Learning Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <BookOpen className="h-5 w-5 text-blue-400" />
              <div>
                <Text size="lg" fw={700} c="white">12</Text>
                <Text size="xs" c="dimmed">Courses Completed</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <Award className="h-5 w-5 text-green-400" />
              <div>
                <Text size="lg" fw={700} c="white">8</Text>
                <Text size="xs" c="dimmed">Achievements Earned</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div>
                <Text size="lg" fw={700} c="white">156</Text>
                <Text size="xs" c="dimmed">Hours Learned</Text>
              </div>
            </Group>
          </Card>
        </div>

        <Tabs defaultValue="courses" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="courses">Courses</Tabs.Tab>
            <Tabs.Tab value="insights">Market Insights</Tabs.Tab>
            <Tabs.Tab value="achievements">Achievements</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="courses" pt="xl">
            <div className="space-y-6">
              {/* Learning Paths */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Learning Paths</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  {learningPaths.map((path) => (
                    <Card key={path.title} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <Group justify="space-between" mb="xs">
                            <Text size="lg" fw={600} c="white">{path.title}</Text>
                            <Badge color="blue" variant="light">{path.difficulty}</Badge>
                          </Group>
                          <Text size="sm" c="dimmed" mb="sm">{path.description}</Text>

                          <Group gap="lg" mb="sm">
                            <Text size="xs" c="dimmed">{path.modules} modules • {path.duration}</Text>
                            <Text size="xs" c="green">{path.completed}/{path.modules} completed</Text>
                          </Group>

                          <Progress value={path.progress} color="green" size="sm" />
                        </div>
                        <Button size="sm" color="green">
                          Continue Learning
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* Featured Courses */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Featured Courses</Text>
                </Card.Section>

                <SimpleGrid cols={1} spacing="md" mt="md">
                  {featuredCourses.map((course) => (
                    <Card key={course.title} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Text size="lg" fw={600} c="white" mb="xs">{course.title}</Text>
                          <Text size="sm" c="dimmed" mb="sm">by {course.instructor}</Text>

                          <Group gap="md" mb="sm">
                            <Group gap="xs">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <Text size="xs" c="white">{course.rating}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">{course.students.toLocaleString()} students</Text>
                            <Text size="xs" c="dimmed">{course.duration}</Text>
                          </Group>

                          <Group gap="xs">
                            <Badge size="sm" color="blue">{course.level}</Badge>
                            <Badge size="sm" color="green">{course.price}</Badge>
                          </Group>
                        </div>
                        <Button size="sm" color="green">
                          Enroll
                        </Button>
                      </div>
                    </Card>
                  ))}
                </SimpleGrid>
              </Card>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="insights" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Market Insights & Analysis</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                {marketInsights.map((insight) => (
                  <Card key={insight.title} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Group justify="space-between" mb="xs">
                          <Text size="lg" fw={600} c="white">{insight.title}</Text>
                          <Badge color="blue" variant="light">{insight.type}</Badge>
                        </Group>
                        <Text size="sm" c="dimmed" mb="sm">by {insight.author}</Text>
                        <Group gap="md">
                          <Text size="xs" c="dimmed">{insight.readTime} read</Text>
                          <Text size="xs" c="dimmed">{insight.views.toLocaleString()} views</Text>
                        </Group>
                      </div>
                      <Button variant="outline" size="sm">
                        Read More
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="achievements" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Achievements & Milestones</Text>
              </Card.Section>

              <SimpleGrid cols={2} spacing="md" mt="md">
                {achievements.map((achievement) => (
                  <Card
                    key={achievement.name}
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{
                      backgroundColor: achievement.earned ? '#25262b' : '#1a1a1a',
                      opacity: achievement.earned ? 1 : 0.6
                    }}
                  >
                    <div className="text-center">
                      <Award
                        className={`h-8 w-8 mx-auto mb-2 ${
                          achievement.earned ? 'text-yellow-400' : 'text-gray-500'
                        }`}
                      />
                      <Text size="sm" fw={600} c="white" mb="xs">{achievement.name}</Text>
                      <Text size="xs" c="dimmed" mb="sm">{achievement.description}</Text>
                      {achievement.earned && (
                        <Badge color="green" size="sm">Earned</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}