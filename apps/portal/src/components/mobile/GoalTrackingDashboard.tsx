"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Edit3,
  CheckCircle,
  Clock,
  Zap,
  Award,
  ArrowUpRight
} from 'lucide-react';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  timeframe: number;
  startDate: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'on_track' | 'ahead' | 'behind' | 'completed';
  monthlyContribution: number;
  icon: string;
}

interface Milestone {
  id: string;
  goalId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
}

const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'Retirement Fund',
    targetAmount: 500000,
    currentAmount: 85000,
    timeframe: 25,
    startDate: '2024-01-01',
    targetDate: '2049-01-01',
    priority: 'high',
    status: 'on_track',
    monthlyContribution: 1500,
    icon: '🎯'
  },
  {
    id: '2',
    name: 'Home Down Payment',
    targetAmount: 80000,
    currentAmount: 32000,
    timeframe: 3,
    startDate: '2024-01-01',
    targetDate: '2027-01-01',
    priority: 'high',
    status: 'ahead',
    monthlyContribution: 1200,
    icon: '🏠'
  },
  {
    id: '3',
    name: 'Emergency Fund',
    targetAmount: 25000,
    currentAmount: 18500,
    timeframe: 1,
    startDate: '2024-01-01',
    targetDate: '2025-01-01',
    priority: 'medium',
    status: 'on_track',
    monthlyContribution: 800,
    icon: '🛡️'
  },
  {
    id: '4',
    name: 'Education Fund',
    targetAmount: 120000,
    currentAmount: 15000,
    timeframe: 12,
    startDate: '2024-01-01',
    targetDate: '2036-01-01',
    priority: 'medium',
    status: 'behind',
    monthlyContribution: 600,
    icon: '🎓'
  }
];

const mockMilestones: Milestone[] = [
  {
    id: '1',
    goalId: '1',
    name: '10% of Retirement Goal',
    targetAmount: 50000,
    targetDate: '2026-01-01',
    completed: true,
    completedDate: '2024-08-15'
  },
  {
    id: '2',
    goalId: '1',
    name: '25% of Retirement Goal',
    targetAmount: 125000,
    targetDate: '2030-01-01',
    completed: false
  },
  {
    id: '3',
    goalId: '2',
    name: '50% of Down Payment',
    targetAmount: 40000,
    targetDate: '2025-07-01',
    completed: false
  },
  {
    id: '4',
    goalId: '3',
    name: 'Emergency Fund Complete',
    targetAmount: 25000,
    targetDate: '2025-01-01',
    completed: false
  }
];

interface GoalTrackingDashboardProps {
  onEditGoal: (goalId: string) => void;
  onAddGoal: () => void;
}

export function GoalTrackingDashboard({ onEditGoal, onAddGoal }: GoalTrackingDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed': return 'text-success bg-success/10 border-success/20';
      case 'ahead': return 'text-primary bg-primary/10 border-primary/20';
      case 'on_track': return 'text-warning bg-warning/10 border-warning/20';
      case 'behind': return 'text-destructive bg-destructive/10 border-destructive/20';
    }
  };

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'ahead': return <ArrowUpRight className="h-4 w-4" />;
      case 'on_track': return <TrendingUp className="h-4 w-4" />;
      case 'behind': return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: Goal['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'ahead': return 'Ahead of Schedule';
      case 'on_track': return 'On Track';
      case 'behind': return 'Behind Schedule';
    }
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    switch (priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-success bg-success/10';
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateTimeRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 30) return `${diffDays} days left`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months left`;
    return `${Math.ceil(diffDays / 365)} years left`;
  };

  const filteredGoals = mockGoals.filter(goal => {
    if (selectedTimeframe === 'all') return true;
    if (selectedTimeframe === 'short') return goal.timeframe <= 2;
    if (selectedTimeframe === 'medium') return goal.timeframe > 2 && goal.timeframe <= 7;
    if (selectedTimeframe === 'long') return goal.timeframe > 7;
    return true;
  });

  const totalGoals = mockGoals.length;
  const completedGoals = mockGoals.filter(g => g.status === 'completed').length;
  const onTrackGoals = mockGoals.filter(g => g.status === 'on_track' || g.status === 'ahead').length;
  const totalProgress = mockGoals.reduce((sum, goal) => sum + calculateProgress(goal.currentAmount, goal.targetAmount), 0) / totalGoals;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">Active Goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{completedGoals}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{Math.round(totalProgress)}%</div>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedTimeframe === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeframe('all')}
        >
          All Goals
        </Button>
        <Button
          variant={selectedTimeframe === 'short' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeframe('short')}
        >
          Short-term (≤2 years)
        </Button>
        <Button
          variant={selectedTimeframe === 'medium' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeframe('medium')}
        >
          Medium-term (3-7 years)
        </Button>
        <Button
          variant={selectedTimeframe === 'long' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeframe('long')}
        >
          Long-term (7+ years)
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.map((goal) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
          const remaining = goal.targetAmount - goal.currentAmount;
          const timeLeft = calculateTimeRemaining(goal.targetDate);
          const goalMilestones = mockMilestones.filter(m => m.goalId === goal.id);
          
          return (
            <Card key={goal.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{goal.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                          {goal.priority.toUpperCase()}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                          {getStatusIcon(goal.status)}
                          <span className="ml-1">{getStatusText(goal.status)}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onEditGoal(goal.id)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>${goal.currentAmount.toLocaleString()} HKD</span>
                    <span>${goal.targetAmount.toLocaleString()} HKD</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Remaining</span>
                    <p className="font-semibold">${remaining.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly</span>
                    <p className="font-semibold">${goal.monthlyContribution.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timeline</span>
                    <p className="font-semibold">{timeLeft}</p>
                  </div>
                </div>

                {/* Milestones */}
                {goalMilestones.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Upcoming Milestones
                    </h4>
                    <div className="space-y-2">
                      {goalMilestones.slice(0, 2).map((milestone) => (
                        <div key={milestone.id} className={`flex items-center gap-3 p-2 rounded-lg ${
                          milestone.completed ? 'bg-success/10' : 'bg-muted/30'
                        }`}>
                          {milestone.completed ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Target className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{milestone.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Target: ${milestone.targetAmount.toLocaleString()} by{' '}
                              {new Date(milestone.targetDate).toLocaleDateString()}
                            </p>
                          </div>
                          {milestone.completed && (
                            <Badge variant="outline" className="text-xs text-success border-success">
                              Completed
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action based on status */}
                {goal.status === 'behind' && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-sm text-destructive">Behind Schedule</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Consider increasing your monthly contribution to ${Math.ceil(remaining / (goal.timeframe * 12))} to stay on track.
                    </p>
                    <Button size="sm" variant="outline" className="border-destructive text-destructive">
                      <Zap className="h-4 w-4 mr-1" />
                      Boost Contribution
                    </Button>
                  </div>
                )}

                {goal.status === 'ahead' && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm text-primary">Ahead of Schedule</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Great progress! You're on track to reach your goal early.
                    </p>
                  </div>
                )}

                {/* Projection */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Projected completion:</span>
                    <span className="font-semibold">
                      {goal.status === 'ahead' ? '6 months early' : 
                       goal.status === 'behind' ? '8 months late' : 
                       'On time'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Expected final amount:</span>
                    <span className="font-semibold text-success">
                      ${(goal.targetAmount * (goal.status === 'ahead' ? 1.1 : goal.status === 'behind' ? 0.95 : 1)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add New Goal Button */}
      <Button 
        className="w-full" 
        variant="outline"
        onClick={onAddGoal}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Goal
      </Button>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Goal Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Target Amount</span>
              <p className="font-semibold text-lg">
                ${mockGoals.reduce((sum, goal) => sum + goal.targetAmount, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Progress</span>
              <p className="font-semibold text-lg">
                ${mockGoals.reduce((sum, goal) => sum + goal.currentAmount, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Contributions</span>
              <p className="font-semibold">
                ${mockGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Goals on Track</span>
              <p className="font-semibold">
                {onTrackGoals}/{totalGoals}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}