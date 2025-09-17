"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Trophy,
  Star,
  Target,
  BookOpen,
  Play,
  CheckCircle,
  Lock,
  Award,
  TrendingUp,
  Brain,
  DollarSign,
  Users,
  Flame,
  Crown,
  Medal,
  Zap,
  Calendar,
  BarChart3,
  Sparkles,
  Gamepad2,
  Volume2,
  Settings
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'quiz' | 'trade' | 'streak';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xpReward: number;
  badgeReward?: string;
  requirement?: string;
  completed: boolean;
  progress: number;
  maxProgress: number;
  category: string;
  timeEstimate: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  xp: number;
  avatar: string;
  streak: number;
  badges: number;
}

interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  totalBadges: number;
  rank: number;
  completedChallenges: number;
  virtualBalance: number;
  virtualProfit: number;
}

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Stock Market Basics',
    description: 'Learn the fundamentals of how the stock market works',
    type: 'lesson',
    difficulty: 'beginner',
    xpReward: 100,
    badgeReward: 'first_lesson',
    completed: true,
    progress: 5,
    maxProgress: 5,
    category: 'Basics',
    timeEstimate: '15 min'
  },
  {
    id: '2',
    title: 'Understanding P/E Ratios',
    description: 'Master the art of evaluating stocks using P/E ratios',
    type: 'lesson',
    difficulty: 'intermediate',
    xpReward: 150,
    completed: false,
    progress: 2,
    maxProgress: 7,
    category: 'Analysis',
    timeEstimate: '20 min'
  },
  {
    id: '3',
    title: 'Risk Management Quiz',
    description: 'Test your knowledge of portfolio risk management',
    type: 'quiz',
    difficulty: 'intermediate',
    xpReward: 200,
    badgeReward: 'risk_master',
    requirement: 'Complete 3 lessons',
    completed: false,
    progress: 0,
    maxProgress: 10,
    category: 'Risk',
    timeEstimate: '10 min'
  },
  {
    id: '4',
    title: 'Make Your First Virtual Trade',
    description: 'Execute your first trade in the virtual trading simulator',
    type: 'trade',
    difficulty: 'beginner',
    xpReward: 250,
    badgeReward: 'first_trader',
    completed: false,
    progress: 0,
    maxProgress: 1,
    category: 'Trading',
    timeEstimate: '5 min'
  },
  {
    id: '5',
    title: '7-Day Learning Streak',
    description: 'Complete a lesson or quiz for 7 consecutive days',
    type: 'streak',
    difficulty: 'intermediate',
    xpReward: 500,
    badgeReward: 'streak_warrior',
    completed: false,
    progress: 3,
    maxProgress: 7,
    category: 'Streak',
    timeEstimate: 'Ongoing'
  },
  {
    id: '6',
    title: 'Technical Analysis Deep Dive',
    description: 'Master charts, indicators, and technical patterns',
    type: 'lesson',
    difficulty: 'advanced',
    xpReward: 300,
    badgeReward: 'chart_master',
    requirement: 'Level 5+',
    completed: false,
    progress: 0,
    maxProgress: 12,
    category: 'Analysis',
    timeEstimate: '45 min'
  }
];

const mockBadges: Badge[] = [
  {
    id: 'first_lesson',
    name: 'First Steps',
    description: 'Completed your first lesson',
    icon: '🎓',
    rarity: 'common',
    earnedAt: '2024-01-15'
  },
  {
    id: 'first_trader',
    name: 'Trading Debut',
    description: 'Made your first virtual trade',
    icon: '📈',
    rarity: 'common'
  },
  {
    id: 'risk_master',
    name: 'Risk Master',
    description: 'Aced the risk management quiz',
    icon: '🛡️',
    rarity: 'rare'
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintained a 7-day learning streak',
    icon: '🔥',
    rarity: 'epic'
  },
  {
    id: 'chart_master',
    name: 'Chart Master',
    description: 'Mastered technical analysis',
    icon: '📊',
    rarity: 'legendary'
  }
];

const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', name: 'Sarah Chen', level: 12, xp: 3450, avatar: 'SC', streak: 15, badges: 8 },
  { id: '2', name: 'Mike Rodriguez', level: 11, xp: 3200, avatar: 'MR', streak: 8, badges: 7 },
  { id: '3', name: 'Emma Wilson', level: 10, xp: 2980, avatar: 'EW', streak: 22, badges: 6 },
  { id: '4', name: 'David Kim', level: 9, xp: 2750, avatar: 'DK', streak: 5, badges: 5 },
  { id: '5', name: 'You', level: 8, xp: 2340, avatar: 'YU', streak: 3, badges: 4 }
];

const userProgress: UserProgress = {
  level: 8,
  xp: 2340,
  xpToNextLevel: 160,
  streak: 3,
  totalBadges: 4,
  rank: 5,
  completedChallenges: 12,
  virtualBalance: 105420,
  virtualProfit: 5420
};

interface GamifiedLearningHubProps {
  onNavigate: (page: string) => void;
}

export function GamifiedLearningHub({ onNavigate }: GamifiedLearningHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Simulate challenge completion with confetti animation
  const handleCompleteChallenge = (challengeId: string) => {
    setShowConfetti(true);
    if (soundEnabled) {
      // Play success sound (would be actual audio in real app)
      console.log('🎵 Success sound played!');
    }
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-success bg-success/10';
      case 'intermediate': return 'text-warning bg-warning/10';
      case 'advanced': return 'text-destructive bg-destructive/10';
    }
  };

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-muted-foreground bg-muted/20 border-muted';
      case 'rare': return 'text-primary bg-primary/10 border-primary';
      case 'epic': return 'text-purple-600 bg-purple-100 border-purple-300';
      case 'legendary': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    }
  };

  const getChallengeIcon = (type: Challenge['type']) => {
    switch (type) {
      case 'lesson': return BookOpen;
      case 'quiz': return Brain;
      case 'trade': return TrendingUp;
      case 'streak': return Flame;
    }
  };

  const categories = ['all', 'Basics', 'Analysis', 'Trading', 'Risk', 'Streak'];
  const filteredChallenges = selectedCategory === 'all' 
    ? mockChallenges 
    : mockChallenges.filter(c => c.category === selectedCategory);

  const earnedBadges = mockBadges.filter(badge => badge.earnedAt);
  const availableBadges = mockBadges.filter(badge => !badge.earnedAt);

  return (
    <div className="pb-4 relative">
      {/* Confetti Animation Overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500/10 via-primary/5 to-pink-500/10 p-6 m-4 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-primary rounded-xl flex items-center justify-center">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Learning Hub</h1>
              <p className="text-muted-foreground">Level up your trading skills</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
            <Volume2 className={`h-4 w-4 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
        
        {/* User Progress */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{userProgress.level}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Level {userProgress.level}</span>
                  <Badge variant="outline" className="text-xs">
                    Rank #{userProgress.rank}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {userProgress.xpToNextLevel} XP to next level
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{userProgress.streak}</span>
              </div>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          </div>
          
          <Progress value={(userProgress.xp / (userProgress.xp + userProgress.xpToNextLevel)) * 100} className="h-2" />
          
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{userProgress.totalBadges}</span>
              </div>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-semibold">{userProgress.completedChallenges}</span>
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-semibold">{userProgress.xp.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="challenges" className="px-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-4 mt-6">
          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>

          {/* Daily Challenge */}
          <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Daily Challenge</h3>
                  <p className="text-sm text-muted-foreground">Complete 2 lessons today</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">2x XP</div>
                  <div className="text-xs text-muted-foreground">Bonus active</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Challenges List */}
          <div className="space-y-4">
            {filteredChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.type);
              const isLocked = challenge.requirement && !challenge.completed && challenge.progress === 0;
              
              return (
                <Card 
                  key={challenge.id} 
                  className={`transition-all duration-200 ${
                    challenge.completed ? 'bg-success/5 border-success/20' : 
                    isLocked ? 'opacity-60' : 'hover:border-primary/50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        challenge.completed ? 'bg-success text-white' :
                        isLocked ? 'bg-muted' : 'bg-primary/10'
                      }`}>
                        {challenge.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : isLocked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{challenge.title}</h3>
                          <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                            {challenge.difficulty}
                          </Badge>
                          {challenge.type === 'streak' && (
                            <Badge variant="outline" className="text-xs">
                              <Flame className="h-3 w-3 mr-1" />
                              Streak
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                        
                        {challenge.requirement && (
                          <p className="text-xs text-warning mb-2">Requires: {challenge.requirement}</p>
                        )}
                        
                        {challenge.progress > 0 && challenge.progress < challenge.maxProgress && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{challenge.progress}/{challenge.maxProgress}</span>
                            </div>
                            <Progress value={(challenge.progress / challenge.maxProgress) * 100} className="h-2" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{challenge.xpReward} XP</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{challenge.timeEstimate}</span>
                            </div>
                            {challenge.badgeReward && (
                              <div className="flex items-center gap-1">
                                <Award className="h-3 w-3 text-primary" />
                                <span>Badge</span>
                              </div>
                            )}
                          </div>
                          
                          {!challenge.completed && !isLocked && (
                            <Button 
                              size="sm"
                              onClick={() => handleCompleteChallenge(challenge.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4 mt-6">
          {/* Earned Badges */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Earned Badges ({earnedBadges.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {earnedBadges.map((badge) => (
                <Card key={badge.id} className={`${getRarityColor(badge.rarity)} border-2`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="font-medium text-sm">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {badge.rarity}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Available Badges */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Available Badges ({availableBadges.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableBadges.map((badge) => (
                <Card key={badge.id} className="opacity-60 border-dashed">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2 grayscale">{badge.icon}</div>
                    <h4 className="font-medium text-sm">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {badge.rarity}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4 mt-6">
          <div className="space-y-3">
            {mockLeaderboard.map((entry, index) => (
              <Card 
                key={entry.id} 
                className={`${entry.name === 'You' ? 'border-primary bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Crown className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">{entry.avatar}</AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{entry.name}</h3>
                        {entry.name === 'You' && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Level {entry.level}</span>
                        <span>{entry.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span>{entry.streak}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Medal className="h-3 w-3 text-yellow-500" />
                          <span>{entry.badges}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Weekly Competition</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Top 3 learners this week win exclusive badges and bonus XP!
              </p>
              <div className="text-xs text-muted-foreground">
                4 days remaining
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4 mt-6">
          {/* Virtual Trading Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Virtual Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">${userProgress.virtualBalance.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Portfolio Value</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${userProgress.virtualProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {userProgress.virtualProfit >= 0 ? '+' : ''}${userProgress.virtualProfit.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total P&L</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Performance</span>
                  <span className="text-success">+5.4%</span>
                </div>
                <Progress value={54} className="h-2" />
              </div>
              
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => onNavigate('trade')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Practice Trading
                </Button>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trading Challenges */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Profit Challenge</h4>
                    <p className="text-xs text-muted-foreground">Make 5% profit in virtual trading</p>
                  </div>
                  <Badge variant="outline">
                    <Zap className="h-3 w-3 mr-1" />
                    500 XP
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Diversification Master</h4>
                    <p className="text-xs text-muted-foreground">Hold positions in 5 different sectors</p>
                  </div>
                  <Badge variant="outline">
                    <Award className="h-3 w-3 mr-1" />
                    Badge
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Risk Manager</h4>
                    <p className="text-xs text-muted-foreground">Use stop-loss orders on 10 trades</p>
                  </div>
                  <Badge variant="outline">
                    <Star className="h-3 w-3 mr-1" />
                    300 XP
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Simulation Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Realistic Market Delays</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Trading Fees Simulation</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Real-time Market Data</Label>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}