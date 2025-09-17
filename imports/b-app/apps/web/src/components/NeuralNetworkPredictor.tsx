import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  BarChart3,
  Activity,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Eye,
  AlertCircle
} from 'lucide-react';

interface NeuralPrediction {
  price: number;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  volatility: number;
  support: number;
  resistance: number;
  confidence: number;
  timeframe: string;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface FeatureImportance {
  [feature: string]: number;
}

interface PredictionAnalysis {
  symbol: string;
  predictions: NeuralPrediction;
  uncertainty: {
    priceRange: { min: number; max: number };
    confidenceInterval: number;
    volatilityRange: { min: number; max: number };
  };
  modelAccuracy: ModelMetrics;
  featureImportance: FeatureImportance;
  trainingData: {
    samples: number;
    timespan: string;
    lastUpdated: string;
  };
}

const NeuralNetworkPredictor: React.FC = () => {
  const [analysis, setAnalysis] = useState<PredictionAnalysis | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [modelStatus, setModelStatus] = useState<'ready' | 'training' | 'predicting'>('ready');

  const timeframes = ['1H', '4H', '1D', '1W', '1M'];
  const symbols = ['AAPL', 'TSLA', 'GOOGL', 'AMZN', 'MSFT', 'NVDA', 'META'];

  const runNeuralPrediction = async () => {
    setIsPredicting(true);
    setModelStatus('predicting');
    
    try {
      const response = await fetch('/api/v1/ai/neural-network-prediction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          symbol: selectedSymbol,
          timeframe: selectedTimeframe 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
      }
    } catch (error) {
      console.error('Neural prediction error:', error);
    } finally {
      setIsPredicting(false);
      setModelStatus('ready');
    }
  };

  const retrainModel = async () => {
    setIsTraining(true);
    setModelStatus('training');
    
    try {
      const response = await fetch('/api/v1/ai/retrain-neural-model', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          symbol: selectedSymbol,
          timeframe: selectedTimeframe 
        })
      });

      if (response.ok) {
        // Model retrained, run new prediction
        await runNeuralPrediction();
      }
    } catch (error) {
      console.error('Model retraining error:', error);
    } finally {
      setIsTraining(false);
      setModelStatus('ready');
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'UP': return TrendingUp;
      case 'DOWN': return TrendingDown;
      default: return Activity;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'UP': return 'text-green-500';
      case 'DOWN': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  useEffect(() => {
    runNeuralPrediction();
  }, [selectedSymbol, selectedTimeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-indigo-500" />
            Neural Network Predictor
          </h1>
          <p className="text-muted-foreground">Deep learning LSTM models for price prediction</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {symbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map(tf => (
                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={runNeuralPrediction} 
            disabled={isPredicting || isTraining}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            {isPredicting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Predict
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Model Status */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                modelStatus === 'ready' ? 'bg-green-500' : 
                modelStatus === 'training' ? 'bg-yellow-500 animate-pulse' : 
                'bg-blue-500 animate-pulse'
              }`} />
              <div>
                <p className="font-semibold">Neural Network Status</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {modelStatus === 'ready' ? 'Ready for predictions' : 
                   modelStatus === 'training' ? 'Training in progress...' : 
                   'Generating predictions...'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={retrainModel}
              disabled={isTraining || isPredicting}
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Retrain Model
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Prediction Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Price</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${analysis.predictions.price.toFixed(2)}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Direction</p>
                    <div className="flex items-center space-x-2">
                      {React.createElement(getDirectionIcon(analysis.predictions.direction), {
                        className: `w-6 h-6 ${getDirectionColor(analysis.predictions.direction)}`
                      })}
                      <span className={`text-xl font-bold ${getDirectionColor(analysis.predictions.direction)}`}>
                        {analysis.predictions.direction}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className={`text-2xl font-bold ${getConfidenceColor(analysis.predictions.confidence)}`}>
                      {(analysis.predictions.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volatility</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(analysis.predictions.volatility * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="prediction" className="space-y-4">
            <TabsList>
              <TabsTrigger value="prediction">Prediction Details</TabsTrigger>
              <TabsTrigger value="uncertainty">Uncertainty Analysis</TabsTrigger>
              <TabsTrigger value="model">Model Performance</TabsTrigger>
              <TabsTrigger value="features">Feature Importance</TabsTrigger>
            </TabsList>

            <TabsContent value="prediction" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Levels</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Predicted Price</span>
                        <span className="font-bold text-lg">${analysis.predictions.price.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Resistance Level</span>
                        <span className="font-semibold text-red-600">
                          ${analysis.predictions.resistance.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Support Level</span>
                        <span className="font-semibold text-green-600">
                          ${analysis.predictions.support.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <div className="relative h-4 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded">
                        <div 
                          className="absolute w-2 h-6 bg-blue-600 rounded -top-1"
                          style={{
                            left: `${((analysis.predictions.price - analysis.predictions.support) / 
                                    (analysis.predictions.resistance - analysis.predictions.support)) * 100}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Support</span>
                        <span>Predicted</span>
                        <span>Resistance</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Training Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-indigo-50 rounded">
                        <p className="text-sm text-muted-foreground">Training Samples</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {analysis.trainingData.samples.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <p className="text-sm text-muted-foreground">Time Span</p>
                        <p className="text-lg font-bold text-purple-600">
                          {analysis.trainingData.timespan}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium">Last Updated:</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analysis.trainingData.lastUpdated}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="uncertainty" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prediction Uncertainty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Price Range Uncertainty</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Lower Bound</span>
                          <span className="font-semibold text-red-600">
                            ${analysis.uncertainty.priceRange.min.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Upper Bound</span>
                          <span className="font-semibold text-green-600">
                            ${analysis.uncertainty.priceRange.max.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence Interval</span>
                          <span className="font-semibold">
                            {(analysis.uncertainty.confidenceInterval * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold">Volatility Range</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Min Volatility</span>
                          <span className="font-semibold">
                            {(analysis.uncertainty.volatilityRange.min * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Volatility</span>
                          <span className="font-semibold">
                            {(analysis.uncertainty.volatilityRange.max * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-yellow-800">Uncertainty Notice</h5>
                        <p className="text-sm text-yellow-700 mt-1">
                          Neural network predictions include inherent uncertainty. Consider the confidence intervals 
                          and use appropriate risk management when making trading decisions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="model" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {(analysis.modelAccuracy.accuracy * 100).toFixed(1)}%
                      </div>
                      <Progress value={analysis.modelAccuracy.accuracy * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Precision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {(analysis.modelAccuracy.precision * 100).toFixed(1)}%
                      </div>
                      <Progress value={analysis.modelAccuracy.precision * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">F1 Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {analysis.modelAccuracy.f1Score.toFixed(2)}
                      </div>
                      <Progress value={analysis.modelAccuracy.f1Score * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sharpe Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-indigo-600 mb-2">
                        {analysis.modelAccuracy.sharpeRatio.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Risk-Adjusted Return</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Max Drawdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        -{(analysis.modelAccuracy.maxDrawdown * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Worst Case Loss</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recall</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {(analysis.modelAccuracy.recall * 100).toFixed(1)}%
                      </div>
                      <Progress value={analysis.modelAccuracy.recall * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analysis.featureImportance)
                      .sort(([,a], [,b]) => b - a)
                      .map(([feature, importance]) => (
                      <div key={feature} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">
                            {feature.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-semibold">
                            {(importance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={importance * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <h5 className="font-semibold mb-2">Feature Explanation</h5>
                    <p className="text-sm text-muted-foreground">
                      Feature importance shows which input variables have the most influence on the neural network's 
                      predictions. Higher values indicate features that contribute more to the model's decision-making process.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!analysis && !isPredicting && (
        <Card className="border-dashed border-2 border-indigo-200">
          <CardContent className="text-center py-12">
            <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Neural Network Ready</h3>
            <p className="text-muted-foreground mb-4">
              Advanced LSTM neural networks trained on historical data for accurate price predictions
            </p>
            <Button 
              onClick={runNeuralPrediction}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <Brain className="w-4 h-4 mr-2" />
              Generate Prediction
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NeuralNetworkPredictor;
