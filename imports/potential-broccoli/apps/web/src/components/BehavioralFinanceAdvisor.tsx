import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Target,
  Shield,
  Lightbulb,
  Eye,
  RefreshCw,
  Zap,
  Heart,
  Users,
  Anchor,
  CheckCircle
} from 'lucide-react';

interface BiasDetection {
  loss_aversion: { severity: number; description: string; examples: string[] };
  overconfidence: { severity: number; description: string; examples: string[] };
  herding_behavior: { severity: number; description: string; examples: string[] };
  anchoring_bias: { severity: number; description: string; examples: string[] };
  confirmation_bias: { severity: number; description: string; examples: string[] };
  recency_bias: { severity: number; description: string; examples: string[] };
}

interface BehaviorProfile {
  riskTolerance: string;
  decisionStyle: string;
  emotionalTrading: number;
  planningHorizon: string;
  learningStyle: string;
}

interface Intervention {
  type: string;
  title: string;
  description: string;
  implementation: string;
  effectiveness: number;
}

interface BehavioralAnalysis {
  behaviorProfile: BehaviorProfile;
  detectedBiases: BiasDetection;
  riskLevel: number;
  interventions: Intervention[];
  personalizedNudges: string[];
  optimalDecisionFramework: {
    steps: string[];
    tools: string[];
    checkpoints: string[];
  };
}

const BehavioralFinanceAdvisor: React.FC = () => {
  const [analysis, setAnalysis] = useState<BehavioralAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedBias, setSelectedBias] = useState<string | null>(null);

  const biasIcons = {
    loss_aversion: TrendingDown,
    overconfidence: TrendingUp,
    herding_behavior: Users,
    anchoring_bias: Anchor,
    confirmation_bias: Eye,
    recency_bias: RefreshCw
  };

  const biasColors = {
    loss_aversion: 'text-red-500',
    overconfidence: 'text-orange-500',
    herding_behavior: 'text-blue-500',
    anchoring_bias: 'text-purple-500',
    confirmation_bias: 'text-green-500',
    recency_bias: 'text-yellow-500'
  };

  const runBehavioralAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/ai/behavioral-finance-analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
      }
    } catch (error) {
      console.error('Behavioral analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity < 0.3) return 'text-green-600';
    if (severity < 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity < 0.3) return 'Low';
    if (severity < 0.6) return 'Moderate';
    return 'High';
  };

  const formatBiasName = (bias: string) => {
    return bias.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  useEffect(() => {
    runBehavioralAnalysis();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-500" />
            Behavioral Finance Advisor
          </h1>
          <p className="text-muted-foreground">AI-powered behavioral bias detection and intervention</p>
        </div>
        <Button 
          onClick={runBehavioralAnalysis} 
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Analyze Behavior
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <>
          {/* Risk Level Alert */}
          <Alert className={`border-2 ${analysis.riskLevel > 0.7 ? 'border-red-200 bg-red-50' : analysis.riskLevel > 0.4 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Behavioral Risk Level: {getSeverityLabel(analysis.riskLevel)}</strong>
              {analysis.riskLevel > 0.7 && " - High risk of emotional trading decisions. Consider implementing strict rules."}
              {analysis.riskLevel > 0.4 && analysis.riskLevel <= 0.7 && " - Moderate behavioral biases detected. Regular monitoring recommended."}
              {analysis.riskLevel <= 0.4 && " - Low behavioral risk. Continue current disciplined approach."}
            </AlertDescription>
          </Alert>

          {/* Behavior Profile Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Risk Tolerance</p>
                  <p className="text-lg font-bold text-purple-600 capitalize">
                    {analysis.behaviorProfile.riskTolerance}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Decision Style</p>
                  <p className="text-lg font-bold text-blue-600 capitalize">
                    {analysis.behaviorProfile.decisionStyle}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Emotional Trading</p>
                  <p className="text-lg font-bold text-orange-600">
                    {(analysis.behaviorProfile.emotionalTrading * 100).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Planning Horizon</p>
                  <p className="text-lg font-bold text-green-600 capitalize">
                    {analysis.behaviorProfile.planningHorizon}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Learning Style</p>
                  <p className="text-lg font-bold text-indigo-600 capitalize">
                    {analysis.behaviorProfile.learningStyle}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="biases" className="space-y-4">
            <TabsList>
              <TabsTrigger value="biases">Detected Biases</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="nudges">Personalized Nudges</TabsTrigger>
              <TabsTrigger value="framework">Decision Framework</TabsTrigger>
            </TabsList>

            <TabsContent value="biases" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analysis.detectedBiases).map(([biasKey, bias]) => {
                  const Icon = biasIcons[biasKey as keyof typeof biasIcons];
                  return (
                    <Card 
                      key={biasKey} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${selectedBias === biasKey ? 'ring-2 ring-purple-500' : ''}`}
                      onClick={() => setSelectedBias(selectedBias === biasKey ? null : biasKey)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-5 h-5 ${biasColors[biasKey as keyof typeof biasColors]}`} />
                            <span>{formatBiasName(biasKey)}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getSeverityColor(bias.severity)}
                          >
                            {getSeverityLabel(bias.severity)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Severity</span>
                              <span className={getSeverityColor(bias.severity)}>
                                {(bias.severity * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={bias.severity * 100} className="h-2" />
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{bias.description}</p>
                          
                          {selectedBias === biasKey && (
                            <div className="mt-4 space-y-2">
                              <h5 className="font-semibold text-sm">Recent Examples:</h5>
                              <ul className="text-xs space-y-1">
                                {bias.examples.map((example: string, index: number) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{example}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="interventions" className="space-y-4">
              <div className="space-y-4">
                {analysis.interventions.map((intervention, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Lightbulb className="w-5 h-5 text-blue-500" />
                          <span>{intervention.title}</span>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          {(intervention.effectiveness * 100).toFixed(0)}% Effective
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{intervention.description}</p>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="font-semibold mb-2 flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          Implementation
                        </h5>
                        <p className="text-sm">{intervention.implementation}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-100 text-blue-800 capitalize">
                          {intervention.type}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Effectiveness:</span>
                          <Progress value={intervention.effectiveness * 100} className="w-20 h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="nudges" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                    Personalized Behavioral Nudges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.personalizedNudges.map((nudge, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Heart className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{nudge}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="framework" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      Decision Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.optimalDecisionFramework.steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-600">
                            {index + 1}
                          </div>
                          <p className="text-sm">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-500" />
                      Decision Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.optimalDecisionFramework.tools.map((tool, index) => (
                        <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                          {tool}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2 text-purple-500" />
                      Checkpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.optimalDecisionFramework.checkpoints.map((checkpoint, index) => (
                        <div key={index} className="p-2 bg-purple-50 rounded text-sm">
                          {checkpoint}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!analysis && !isAnalyzing && (
        <Card className="border-dashed border-2 border-purple-200">
          <CardContent className="text-center py-12">
            <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Behavioral Analysis Ready</h3>
            <p className="text-muted-foreground mb-4">
              Discover your trading biases and get personalized interventions to improve decision-making
            </p>
            <Button 
              onClick={runBehavioralAnalysis}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Brain className="w-4 h-4 mr-2" />
              Start Behavioral Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BehavioralFinanceAdvisor;
