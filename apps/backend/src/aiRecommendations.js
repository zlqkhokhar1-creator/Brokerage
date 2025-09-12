const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// AI-powered investment recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { riskProfile, investmentGoals, portfolioValue, timeHorizon = 'long' } = req.query;

    // Get user's current portfolio
    const portfolioResult = await db.query(`
      SELECT 
        p.id, p.name, p.risk_level, p.target_return,
        ph.security_id, ph.quantity, ph.average_cost,
        s.symbol, s.name as security_name, s.type, s.sector, s.industry,
        md.price as current_price
      FROM portfolios p
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      LEFT JOIN securities s ON ph.security_id = s.id
      LEFT JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE p.user_id = $1 AND p.is_active = true
    `, [req.user.userId]);

    // Analyze current portfolio
    const portfolioAnalysis = analyzePortfolio(portfolioResult.rows);
    
    // Generate AI recommendations based on user profile and portfolio
    const recommendations = await generateRecommendations({
      riskProfile: riskProfile || 'moderate',
      investmentGoals: investmentGoals ? investmentGoals.split(',') : ['wealth_building'],
      portfolioValue: parseFloat(portfolioValue) || 10000,
      timeHorizon,
      currentPortfolio: portfolioAnalysis
    });

    res.json({
      recommendations,
      portfolioAnalysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ message: 'Error generating recommendations' });
  }
});

// Analyze user's current portfolio
function analyzePortfolio(holdings) {
  const analysis = {
    totalValue: 0,
    sectorAllocation: {},
    assetTypeAllocation: {},
    riskScore: 0,
    diversificationScore: 0,
    topHoldings: [],
    underperforming: [],
    overperforming: []
  };

  let totalValue = 0;
  const holdingsData = [];

  // Calculate current values and performance
  holdings.forEach(holding => {
    if (holding.security_id && holding.current_price) {
      const currentValue = holding.quantity * holding.current_price;
      const costBasis = holding.quantity * holding.average_cost;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      holdingsData.push({
        ...holding,
        currentValue,
        costBasis,
        pnl,
        pnlPercent
      });

      totalValue += currentValue;

      // Sector allocation
      if (holding.sector) {
        analysis.sectorAllocation[holding.sector] = 
          (analysis.sectorAllocation[holding.sector] || 0) + currentValue;
      }

      // Asset type allocation
      analysis.assetTypeAllocation[holding.type] = 
        (analysis.assetTypeAllocation[holding.type] || 0) + currentValue;
    }
  });

  analysis.totalValue = totalValue;

  // Calculate percentages
  Object.keys(analysis.sectorAllocation).forEach(sector => {
    analysis.sectorAllocation[sector] = 
      (analysis.sectorAllocation[sector] / totalValue) * 100;
  });

  Object.keys(analysis.assetTypeAllocation).forEach(type => {
    analysis.assetTypeAllocation[type] = 
      (analysis.assetTypeAllocation[type] / totalValue) * 100;
  });

  // Sort holdings by value
  holdingsData.sort((a, b) => b.currentValue - a.currentValue);
  analysis.topHoldings = holdingsData.slice(0, 5);

  // Identify underperforming and overperforming holdings
  analysis.underperforming = holdingsData.filter(h => h.pnlPercent < -10);
  analysis.overperforming = holdingsData.filter(h => h.pnlPercent > 20);

  // Calculate diversification score (0-100)
  const sectorCount = Object.keys(analysis.sectorAllocation).length;
  const maxSectorWeight = Math.max(...Object.values(analysis.sectorAllocation));
  analysis.diversificationScore = Math.min(100, (sectorCount * 10) + (100 - maxSectorWeight));

  // Calculate risk score based on volatility and concentration
  analysis.riskScore = calculateRiskScore(holdingsData, analysis);

  return analysis;
}

// Calculate portfolio risk score
function calculateRiskScore(holdings, analysis) {
  let riskScore = 0;

  // Concentration risk (higher if too much in single holdings)
  const maxHoldingWeight = Math.max(...holdings.map(h => h.currentValue / analysis.totalValue));
  riskScore += maxHoldingWeight * 40; // 0-40 points

  // Diversification risk (lower if well diversified)
  riskScore += (100 - analysis.diversificationScore) * 0.3; // 0-30 points

  // Volatility risk (simplified - in production, use actual volatility data)
  const highVolatilityHoldings = holdings.filter(h => 
    ['crypto', 'small_cap', 'emerging_markets'].includes(h.type)
  ).length;
  riskScore += highVolatilityHoldings * 5; // 0-30 points

  return Math.min(100, Math.round(riskScore));
}

// Generate AI recommendations
async function generateRecommendations({ riskProfile, investmentGoals, portfolioValue, timeHorizon, currentPortfolio }) {
  const recommendations = [];

  // 1. Asset Allocation Recommendations
  const targetAllocation = getTargetAllocation(riskProfile, timeHorizon);
  const currentAllocation = currentPortfolio.assetTypeAllocation;
  
  recommendations.push({
    type: 'asset_allocation',
    priority: 'high',
    title: 'Optimize Asset Allocation',
    description: 'Rebalance your portfolio to match your risk profile',
    currentAllocation,
    targetAllocation,
    actions: generateRebalancingActions(currentAllocation, targetAllocation, portfolioValue)
  });

  // 2. Diversification Recommendations
  if (currentPortfolio.diversificationScore < 70) {
    const diversificationRec = await generateDiversificationRecommendations(currentPortfolio, riskProfile);
    recommendations.push(diversificationRec);
  }

  // 3. Sector Recommendations
  const sectorRec = await generateSectorRecommendations(currentPortfolio, riskProfile, investmentGoals);
  if (sectorRec) {
    recommendations.push(sectorRec);
  }

  // 4. Individual Security Recommendations
  const securityRec = await generateSecurityRecommendations(currentPortfolio, riskProfile, investmentGoals);
  recommendations.push(...securityRec);

  // 5. Risk Management Recommendations
  if (currentPortfolio.riskScore > 70) {
    recommendations.push({
      type: 'risk_management',
      priority: 'high',
      title: 'Reduce Portfolio Risk',
      description: 'Your portfolio risk is high. Consider reducing exposure to volatile assets.',
      actions: [
        'Reduce position sizes in high-volatility holdings',
        'Add more defensive stocks or bonds',
        'Consider stop-loss orders for risky positions'
      ]
    });
  }

  // 6. Tax Optimization Recommendations
  if (portfolioValue > 50000) {
    recommendations.push({
      type: 'tax_optimization',
      priority: 'medium',
      title: 'Tax-Loss Harvesting Opportunity',
      description: 'Consider selling underperforming positions to offset gains',
      actions: [
        'Review underperforming holdings for tax-loss harvesting',
        'Consider tax-advantaged accounts for long-term holdings',
        'Time capital gains realization strategically'
      ]
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Get target asset allocation based on risk profile
function getTargetAllocation(riskProfile, timeHorizon) {
  const allocations = {
    conservative: {
      stocks: 30,
      bonds: 60,
      cash: 10,
      alternatives: 0
    },
    moderate: {
      stocks: 60,
      bonds: 30,
      cash: 5,
      alternatives: 5
    },
    aggressive: {
      stocks: 80,
      bonds: 15,
      cash: 2,
      alternatives: 3
    }
  };

  const base = allocations[riskProfile] || allocations.moderate;
  
  // Adjust for time horizon
  if (timeHorizon === 'short') {
    base.stocks = Math.max(20, base.stocks - 20);
    base.bonds = Math.min(70, base.bonds + 20);
  } else if (timeHorizon === 'long') {
    base.stocks = Math.min(90, base.stocks + 10);
    base.bonds = Math.max(10, base.bonds - 10);
  }

  return base;
}

// Generate rebalancing actions
function generateRebalancingActions(current, target, portfolioValue) {
  const actions = [];
  const threshold = 5; // 5% threshold for rebalancing

  Object.keys(target).forEach(assetType => {
    const currentWeight = current[assetType] || 0;
    const targetWeight = target[assetType];
    const difference = currentWeight - targetWeight;

    if (Math.abs(difference) > threshold) {
      const amount = Math.abs(difference) * portfolioValue / 100;
      const action = difference > 0 ? 'Reduce' : 'Increase';
      
      actions.push({
        action: `${action} ${assetType} allocation`,
        current: `${currentWeight.toFixed(1)}%`,
        target: `${targetWeight.toFixed(1)}%`,
        amount: `$${amount.toFixed(0)}`,
        priority: Math.abs(difference) > 15 ? 'high' : 'medium'
      });
    }
  });

  return actions;
}

// Generate diversification recommendations
async function generateDiversificationRecommendations(portfolio, riskProfile) {
  const recommendations = {
    type: 'diversification',
    priority: 'medium',
    title: 'Improve Portfolio Diversification',
    description: 'Add exposure to underrepresented sectors and asset classes',
    actions: []
  };

  // Check for underrepresented sectors
  const targetSectors = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Industrials'];
  const currentSectors = Object.keys(portfolio.sectorAllocation);
  
  targetSectors.forEach(sector => {
    if (!currentSectors.includes(sector) || portfolio.sectorAllocation[sector] < 5) {
      recommendations.actions.push({
        action: `Add exposure to ${sector} sector`,
        reason: 'Improve sector diversification',
        suggestedWeight: '5-15%'
      });
    }
  });

  // Check for international exposure
  if (!portfolio.assetTypeAllocation.international || portfolio.assetTypeAllocation.international < 10) {
    recommendations.actions.push({
      action: 'Add international exposure',
      reason: 'Geographic diversification',
      suggestedWeight: '10-30%'
    });
  }

  return recommendations;
}

// Generate sector recommendations
async function generateSectorRecommendations(portfolio, riskProfile, investmentGoals) {
  // Get current market trends (simplified - in production, use real market data)
  const sectorTrends = {
    'Technology': { trend: 'bullish', reason: 'AI and cloud computing growth' },
    'Healthcare': { trend: 'stable', reason: 'Aging population and innovation' },
    'Financials': { trend: 'neutral', reason: 'Interest rate sensitivity' },
    'Energy': { trend: 'volatile', reason: 'Oil price fluctuations' },
    'Consumer Discretionary': { trend: 'cyclical', reason: 'Economic cycle dependent' }
  };

  const recommendations = {
    type: 'sector_rotation',
    priority: 'medium',
    title: 'Sector Rotation Opportunities',
    description: 'Consider adjusting sector exposure based on market trends',
    actions: []
  };

  Object.entries(sectorTrends).forEach(([sector, trend]) => {
    const currentWeight = portfolio.sectorAllocation[sector] || 0;
    
    if (trend.trend === 'bullish' && currentWeight < 15) {
      recommendations.actions.push({
        action: `Consider increasing ${sector} exposure`,
        reason: trend.reason,
        currentWeight: `${currentWeight.toFixed(1)}%`,
        suggestedWeight: '15-25%'
      });
    } else if (trend.trend === 'volatile' && currentWeight > 20) {
      recommendations.actions.push({
        action: `Consider reducing ${sector} exposure`,
        reason: trend.reason,
        currentWeight: `${currentWeight.toFixed(1)}%`,
        suggestedWeight: '5-15%'
      });
    }
  });

  return recommendations.actions.length > 0 ? recommendations : null;
}

// Generate individual security recommendations
async function generateSecurityRecommendations(portfolio, riskProfile, investmentGoals) {
  const recommendations = [];

  // Get top-performing securities to consider
  const topPerformers = await db.query(`
    SELECT 
      s.*,
      md.price,
      md.change_percentage,
      md.volume
    FROM securities s
    JOIN LATERAL (
      SELECT price, change_percentage, volume
      FROM market_data 
      WHERE security_id = s.id 
      ORDER BY timestamp DESC 
      LIMIT 1
    ) md ON true
    WHERE s.is_active = true
    ORDER BY md.change_percentage DESC
    LIMIT 10
  `);

  // Filter based on risk profile and goals
  const filteredSecurities = topPerformers.rows.filter(security => {
    if (riskProfile === 'conservative' && security.type === 'crypto') return false;
    if (riskProfile === 'aggressive' && security.type === 'bond') return false;
    return true;
  });

  // Generate buy recommendations
  filteredSecurities.slice(0, 3).forEach(security => {
    recommendations.push({
      type: 'security_recommendation',
      priority: 'low',
      title: `Consider ${security.symbol}`,
      description: `${security.name} - ${security.change_percentage > 0 ? 'Strong' : 'Stable'} performance`,
      symbol: security.symbol,
      name: security.name,
      price: security.price,
      changePercent: security.change_percentage,
      reason: getRecommendationReason(security, riskProfile, investmentGoals),
      action: 'BUY',
      suggestedWeight: getSuggestedWeight(security, riskProfile)
    });
  });

  // Generate sell recommendations for underperforming holdings
  portfolio.underperforming.forEach(holding => {
    if (holding.pnlPercent < -20) {
      recommendations.push({
        type: 'security_recommendation',
        priority: 'medium',
        title: `Consider selling ${holding.symbol}`,
        description: `Underperforming by ${Math.abs(holding.pnlPercent).toFixed(1)}%`,
        symbol: holding.symbol,
        name: holding.security_name,
        price: holding.current_price,
        changePercent: holding.pnlPercent,
        reason: 'Significant underperformance',
        action: 'SELL',
        suggestedWeight: '0%'
      });
    }
  });

  return recommendations;
}

// Get recommendation reason
function getRecommendationReason(security, riskProfile, investmentGoals) {
  const reasons = [];
  
  if (security.change_percentage > 10) {
    reasons.push('Strong recent performance');
  }
  
  if (security.sector === 'Technology' && investmentGoals.includes('growth')) {
    reasons.push('Aligns with growth objectives');
  }
  
  if (security.type === 'etf' && riskProfile === 'conservative') {
    reasons.push('Diversified, low-risk option');
  }
  
  return reasons.join(', ') || 'Based on technical analysis';
}

// Get suggested weight for security
function getSuggestedWeight(security, riskProfile) {
  const weights = {
    conservative: { individual: '2-5%', etf: '5-10%' },
    moderate: { individual: '3-8%', etf: '8-15%' },
    aggressive: { individual: '5-12%', etf: '10-20%' }
  };
  
  return weights[riskProfile][security.type] || '3-8%';
}

// Get AI insights for portfolio
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const { period = '1M' } = req.query;

    // Get portfolio performance data
    const performanceResult = await db.query(`
      SELECT 
        p.id, p.name, p.risk_level,
        SUM(ph.quantity * md.price) as current_value,
        SUM(ph.quantity * ph.average_cost) as cost_basis
      FROM portfolios p
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      LEFT JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = ph.security_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE p.user_id = $1 AND p.is_active = true
      GROUP BY p.id, p.name, p.risk_level
    `, [req.user.userId]);

    const insights = [];

    performanceResult.rows.forEach(portfolio => {
      const totalReturn = portfolio.cost_basis > 0 
        ? ((portfolio.current_value - portfolio.cost_basis) / portfolio.cost_basis) * 100 
        : 0;

      // Generate insights based on performance
      if (totalReturn > 20) {
        insights.push({
          type: 'performance',
          level: 'positive',
          title: 'Excellent Performance',
          message: `Your ${portfolio.name} portfolio is up ${totalReturn.toFixed(1)}%`,
          recommendation: 'Consider taking some profits or rebalancing'
        });
      } else if (totalReturn < -10) {
        insights.push({
          type: 'performance',
          level: 'warning',
          title: 'Portfolio Underperformance',
          message: `Your ${portfolio.name} portfolio is down ${Math.abs(totalReturn).toFixed(1)}%`,
          recommendation: 'Review holdings and consider rebalancing'
        });
      }

      // Risk level insights
      if (portfolio.risk_level === 'aggressive' && totalReturn < -15) {
        insights.push({
          type: 'risk',
          level: 'warning',
          title: 'High Risk Exposure',
          message: 'Your aggressive portfolio is experiencing significant losses',
          recommendation: 'Consider reducing risk or adding defensive positions'
        });
      }
    });

    res.json({
      insights,
      generatedAt: new Date().toISOString(),
      period
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Error generating insights' });
  }
});

module.exports = router;


