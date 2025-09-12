import { internalApi } from './client';

export interface RecommendationRequest {
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  investmentGoals?: string[];
  portfolioValue?: number;
  timeHorizon?: 'short' | 'medium' | 'long';
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  portfolioAnalysis: PortfolioAnalysis;
  generatedAt: string;
}

export interface Recommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
  currentAllocation?: any;
  targetAllocation?: any;
  actions: RecommendationAction[];
}

export interface RecommendationAction {
  action: string;
  current?: string;
  target?: string;
  amount?: string;
  priority?: string;
  reason?: string;
}

export interface PortfolioAnalysis {
  totalValue: number;
  sectorAllocation: { [key: string]: number };
  assetTypeAllocation: { [key: string]: number };
  topHoldings: any[];
  underperforming: any[];
  overperforming: any[];
  diversificationScore: number;
  riskScore: number;
}

export const aiRecommendationsApi = {
  // Get AI recommendations for user's portfolio
  getRecommendations: async (params?: RecommendationRequest): Promise<RecommendationResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.riskProfile) queryParams.append('riskProfile', params.riskProfile);
    if (params?.investmentGoals) queryParams.append('investmentGoals', params.investmentGoals.join(','));
    if (params?.portfolioValue) queryParams.append('portfolioValue', params.portfolioValue.toString());
    if (params?.timeHorizon) queryParams.append('timeHorizon', params.timeHorizon);

    const url = `/ai-recommendations/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await internalApi.get(url);
    return response.data;
  },

  // Update recommendation status (implement/dismiss)
  updateRecommendationStatus: async (recommendationId: string, status: 'implemented' | 'dismissed'): Promise<any> => {
    const response = await internalApi.put(`/ai-recommendations/recommendations/${recommendationId}/status`, { status });
    return response.data;
  },

  // Get recommendation performance metrics
  getRecommendationPerformance: async (): Promise<any> => {
    const response = await internalApi.get('/ai-recommendations/performance');
    return response.data;
  },

  // Get AI model confidence metrics
  getAIConfidence: async (): Promise<any> => {
    const response = await internalApi.get('/ai-recommendations/confidence');
    return response.data;
  },

  // Refresh recommendations (trigger new analysis)
  refreshRecommendations: async (): Promise<RecommendationResponse> => {
    const response = await internalApi.post('/ai-recommendations/recommendations/refresh');
    return response.data;
  }
};
