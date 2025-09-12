/**
 * Interactive Learning Dashboard - Educational content and tutorials
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Play, 
  Trophy, 
  Users, 
  Calendar,
  Clock,
  Star,
  ChevronRight,
  GraduationCap,
  Target,
  Award
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: string;
}

interface LearningPath {
  pathId: string;
  title: string;
  description: string;
  estimatedDuration: string;
  modules: Array<{
    id: number;
    title: string;
    status: string;
  }>;
  currentModule: number;
  progress: number;
  achievements: string[];
  nextMilestone: string;
}

interface GamifiedModules {
  userLevel: number;
  totalPoints: number;
  badges: string[];
  streak: number;
  modules: Array<{
    id: string;
    title: string;
    points: number;
    difficulty: string;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    reward: number;
  }>;
  leaderboard: Array<{
    rank: number;
    user: string;
    points: number;
  }>;
  achievements: string[];
}

interface Webinar {
  id: string;
  title: string;
  speaker: string;
  date: string;
  duration: number;
}

export const InteractiveLearningDashboard: React.FC = () => {
  const [tutorials, setTutorials] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [gamifiedModules, setGamifiedModules] = useState<GamifiedModules | null>(null);
  const [webinars, setWebinars] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tutorials');

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      const [tutorialsRes, pathRes, gamificationRes, webinarsRes] = await Promise.all([
        fetch('/api/v1/advanced/education/tutorials', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/learning-path', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/gamified-modules', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/webinars', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      const [tutorialsData, pathData, gamificationData, webinarsData] = await Promise.all([
        tutorialsRes.json(),
        pathRes.json(),
        gamificationRes.json(),
        webinarsRes.json()
      ]);

      if (tutorialsData.success) setTutorials(tutorialsData.data);
      if (pathData.success) setLearningPath(pathData.data);
      if (gamificationData.success) setGamifiedModules(gamificationData.data);
      if (webinarsData.success) setWebinars(webinarsData.data);
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTutorial = async (tutorialId: string) => {
    try {
      const response = await fetch(`/api/v1/advanced/education/tutorials/${tutorialId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Navigate to tutorial or open tutorial modal
        console.log('Tutorial started:', data);
      }
    } catch (error) {
      console.error('Failed to start tutorial:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'current': return '▶️';
      case 'locked': return '🔒';
      default: return '⭕';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Learning Center
          </h1>
          <p className="text-gray-600">Enhance your trading skills with interactive content</p>
        </div>
        {gamifiedModules && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Level</div>
              <div className="text-xl font-bold text-blue-600">{gamifiedModules.userLevel}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Points</div>
              <div className="text-xl font-bold text-green-600">{gamifiedModules.totalPoints.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Streak</div>
              <div className="text-xl font-bold text-orange-600">{gamifiedModules.streak} days</div>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="learning-path">Learning Path</TabsTrigger>
          <TabsTrigger value="gamification">Challenges</TabsTrigger>
          <TabsTrigger value="webinars">Webinars</TabsTrigger>
        </TabsList>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials" className="space-y-4">
          {tutorials && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tutorials.available?.map((tutorial: Tutorial) => (
                <Card key={tutorial.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getDifficultyColor(tutorial.difficulty)}>
                        {tutorial.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {tutorial.estimatedTime}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {tutorial.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => startTutorial(tutorial.id)}
                      className="w-full"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Tutorial
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Learning Path Tab */}
        <TabsContent value="learning-path" className="space-y-4">
          {learningPath && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {learningPath.title}
                  </CardTitle>
                  <CardDescription>{learningPath.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(learningPath.progress * 100)}%</span>
                  </div>
                  <Progress value={learningPath.progress * 100} className="h-2" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                      <h4 className="font-semibold mb-3">Learning Modules</h4>
                      <div className="space-y-2">
                        {learningPath.modules.map((module) => (
                          <div key={module.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <span className="text-lg">{getModuleStatusIcon(module.status)}</span>
                            <span className={`text-sm ${module.status === 'current' ? 'font-semibold text-blue-600' : ''}`}>
                              {module.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Achievements</h4>
                      <div className="flex flex-wrap gap-2">
                        {learningPath.achievements.map((achievement, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {achievement}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">Next Milestone</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">{learningPath.nextMilestone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Gamification Tab */}
        <TabsContent value="gamification" className="space-y-4">
          {gamifiedModules && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Challenges */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold">Active Challenges</h3>
                {gamifiedModules.challenges.map((challenge) => (
                  <Card key={challenge.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{challenge.title}</h4>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {challenge.reward} pts
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{challenge.progress}/{challenge.target}</span>
                      </div>
                      <Progress value={(challenge.progress / challenge.target) * 100} className="h-2" />
                    </CardContent>
                  </Card>
                ))}

                <h3 className="text-lg font-semibold mt-6">Learning Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gamifiedModules.modules.map((module) => (
                    <Card key={module.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{module.title}</h4>
                          <Badge className={getDifficultyColor(module.difficulty)}>
                            {module.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{module.points} points</span>
                          <Button size="sm" variant="outline">
                            Start
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Badges */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Badges Earned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {gamifiedModules.badges.map((badge, index) => (
                        <div key={index} className="text-center p-2 bg-yellow-50 rounded-lg">
                          <div className="text-2xl">🏆</div>
                          <div className="text-xs text-yellow-700">{badge}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {gamifiedModules.leaderboard.slice(0, 5).map((entry) => (
                        <div key={entry.rank} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                              entry.rank === 2 ? 'bg-gray-100 text-gray-800' :
                              entry.rank === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {entry.rank}
                            </span>
                            <span className="text-sm">{entry.user}</span>
                          </div>
                          <span className="text-sm font-medium">{entry.points.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Webinars Tab */}
        <TabsContent value="webinars" className="space-y-4">
          {webinars && (
            <div className="space-y-6">
              {webinars.upcoming?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upcoming Webinars</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {webinars.upcoming.map((webinar: Webinar) => (
                      <Card key={webinar.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{webinar.title}</CardTitle>
                          <CardDescription>by {webinar.speaker}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(webinar.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {webinar.duration} min
                            </div>
                          </div>
                          <Button className="w-full" size="sm">
                            Register
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {webinars.recorded?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recorded Sessions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {webinars.recorded.map((webinar: any) => (
                      <Card key={webinar.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{webinar.title}</CardTitle>
                          <CardDescription>by {webinar.expert}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                            <span>{Math.floor(webinar.duration / 60)} min</span>
                            <span>{webinar.views.toLocaleString()} views</span>
                          </div>
                          <Button variant="outline" className="w-full" size="sm">
                            <Play className="h-3 w-3 mr-2" />
                            Watch
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InteractiveLearningDashboard;