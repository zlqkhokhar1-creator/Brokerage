const natural = require('natural');
const Sentiment = require('sentiment');
const { logger } = require('../utils/logger');

class SentimentAnalyzer {
  constructor() {
    // Initialize sentiment analyzer with custom financial lexicon
    this.sentiment = new Sentiment();
    this.addFinancialLexicon();
    
    // Initialize natural language processing tools
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.stopWords = new Set(natural.stopwords);
    
    // Financial sentiment patterns
    this.financialPatterns = {
      positive: [
        /bullish|bull|rally|surge|soar|jump|climb|gain|profit|earnings|beat|exceed|strong|growth|positive|optimistic|upgrade|buy|outperform/i,
        /breakthrough|milestone|record|high|peak|momentum|breakout|resistance|support|break/i,
        /dividend|yield|return|value|undervalued|bargain|opportunity|potential|upside/i
      ],
      negative: [
        /bearish|bear|crash|plunge|drop|fall|decline|loss|miss|disappoint|weak|negative|pessimistic|downgrade|sell|underperform/i,
        /resistance|breakdown|support|break|low|bottom|trough|momentum|breakdown/i,
        /debt|loss|cut|reduce|layoff|restructure|bankruptcy|default|risk|volatile|uncertainty/i
      ],
      neutral: [
        /hold|maintain|stable|flat|sideways|consolidate|range|trading|volatile|mixed|neutral/i
      ]
    };

    // Market context patterns
    this.marketContextPatterns = {
      earnings: /earnings|quarterly|q[1-4]|revenue|profit|eps|guidance|outlook/i,
      analyst: /analyst|rating|target|price|upgrade|downgrade|initiate|coverage/i,
      news: /news|announcement|report|update|press|release|statement/i,
      technical: /technical|chart|pattern|resistance|support|breakout|breakdown|rsi|macd|moving average/i,
      fundamental: /fundamental|valuation|pe|pb|debt|equity|balance sheet|income statement/i
    };

    // Sentiment intensity modifiers
    this.intensityModifiers = {
      high: ['very', 'extremely', 'significantly', 'dramatically', 'massively', 'huge', 'major', 'substantial'],
      medium: ['quite', 'fairly', 'somewhat', 'moderately', 'reasonably', 'decent'],
      low: ['slightly', 'somewhat', 'a bit', 'marginally', 'minimally']
    };
  }

  addFinancialLexicon() {
    // Add financial terms to sentiment lexicon
    const financialTerms = {
      // Positive financial terms
      'bullish': 2,
      'bull': 2,
      'rally': 2,
      'surge': 2,
      'soar': 2,
      'jump': 2,
      'climb': 2,
      'gain': 2,
      'profit': 2,
      'earnings': 1,
      'beat': 2,
      'exceed': 2,
      'strong': 1,
      'growth': 1,
      'positive': 1,
      'optimistic': 1,
      'upgrade': 2,
      'buy': 1,
      'outperform': 2,
      'breakthrough': 2,
      'milestone': 1,
      'record': 1,
      'high': 1,
      'peak': 1,
      'momentum': 1,
      'breakout': 2,
      'dividend': 1,
      'yield': 1,
      'return': 1,
      'value': 1,
      'undervalued': 2,
      'bargain': 2,
      'opportunity': 1,
      'potential': 1,
      'upside': 1,
      
      // Negative financial terms
      'bearish': -2,
      'bear': -2,
      'crash': -3,
      'plunge': -3,
      'drop': -2,
      'fall': -2,
      'decline': -2,
      'loss': -2,
      'miss': -2,
      'disappoint': -2,
      'weak': -1,
      'negative': -1,
      'pessimistic': -1,
      'downgrade': -2,
      'sell': -1,
      'underperform': -2,
      'breakdown': -2,
      'low': -1,
      'bottom': -1,
      'trough': -1,
      'debt': -1,
      'cut': -1,
      'reduce': -1,
      'layoff': -2,
      'restructure': -1,
      'bankruptcy': -3,
      'default': -3,
      'risk': -1,
      'volatile': -1,
      'uncertainty': -1,
      
      // Neutral terms
      'hold': 0,
      'maintain': 0,
      'stable': 0,
      'flat': 0,
      'sideways': 0,
      'consolidate': 0,
      'range': 0,
      'trading': 0,
      'mixed': 0,
      'neutral': 0
    };

    // Add terms to sentiment analyzer
    Object.entries(financialTerms).forEach(([term, score]) => {
      this.sentiment.registerLanguage('en', {
        labels: { [term]: score }
      });
    });
  }

  async analyzeText(text, options = {}) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }

      const {
        symbol,
        source,
        metadata = {},
        userId
      } = options;

      // Clean and preprocess text
      const cleanedText = this.preprocessText(text);
      
      // Basic sentiment analysis
      const basicSentiment = this.sentiment.analyze(cleanedText);
      
      // Financial pattern analysis
      const financialAnalysis = this.analyzeFinancialPatterns(cleanedText);
      
      // Context analysis
      const contextAnalysis = this.analyzeContext(cleanedText, metadata);
      
      // Intensity analysis
      const intensityAnalysis = this.analyzeIntensity(cleanedText);
      
      // Combine analyses
      const combinedScore = this.combineAnalyses(
        basicSentiment,
        financialAnalysis,
        contextAnalysis,
        intensityAnalysis
      );

      // Calculate confidence
      const confidence = this.calculateConfidence(
        basicSentiment,
        financialAnalysis,
        contextAnalysis,
        intensityAnalysis
      );

      // Determine sentiment category
      const category = this.categorizeSentiment(combinedScore.score);

      // Extract key phrases
      const keyPhrases = this.extractKeyPhrases(cleanedText);

      // Generate insights
      const insights = this.generateInsights(
        combinedScore,
        financialAnalysis,
        contextAnalysis,
        keyPhrases
      );

      const result = {
        sentiment: {
          score: combinedScore.score,
          polarity: combinedScore.polarity,
          subjectivity: combinedScore.subjectivity,
          category
        },
        confidence,
        analysis: {
          basic: basicSentiment,
          financial: financialAnalysis,
          context: contextAnalysis,
          intensity: intensityAnalysis
        },
        keyPhrases,
        insights,
        metadata: {
          symbol,
          source,
          userId,
          timestamp: new Date().toISOString(),
          textLength: text.length,
          processedTextLength: cleanedText.length
        }
      };

      logger.debug('Sentiment analysis completed', {
        symbol,
        source,
        score: result.sentiment.score,
        confidence: result.confidence,
        category: result.sentiment.category
      });

      return result;

    } catch (error) {
      logger.error('Error in sentiment analysis:', error);
      throw error;
    }
  }

  preprocessText(text) {
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove URLs
    processed = processed.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove special characters but keep financial symbols
    processed = processed.replace(/[^\w\s$%+\-.,!?]/g, ' ');
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Handle financial symbols and numbers
    processed = this.normalizeFinancialTerms(processed);
    
    return processed;
  }

  normalizeFinancialTerms(text) {
    // Normalize common financial abbreviations
    const normalizations = {
      'eps': 'earnings per share',
      'pe': 'price to earnings',
      'pb': 'price to book',
      'roe': 'return on equity',
      'roa': 'return on assets',
      'debt': 'debt',
      'revenue': 'revenue',
      'profit': 'profit',
      'loss': 'loss',
      'growth': 'growth',
      'yoy': 'year over year',
      'qoq': 'quarter over quarter',
      'mom': 'month over month'
    };

    let normalized = text;
    Object.entries(normalizations).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    });

    return normalized;
  }

  analyzeFinancialPatterns(text) {
    const patterns = {
      positive: 0,
      negative: 0,
      neutral: 0,
      matches: []
    };

    // Check each pattern category
    Object.entries(this.financialPatterns).forEach(([category, regexList]) => {
      regexList.forEach(regex => {
        const matches = text.match(regex);
        if (matches) {
          patterns[category]++;
          patterns.matches.push({
            category,
            matches: matches,
            pattern: regex.source
          });
        }
      });
    });

    // Calculate financial sentiment score
    const totalMatches = patterns.positive + patterns.negative + patterns.neutral;
    let financialScore = 0;
    
    if (totalMatches > 0) {
      financialScore = (patterns.positive - patterns.negative) / totalMatches;
    }

    return {
      score: financialScore,
      patterns,
      hasFinancialContext: totalMatches > 0
    };
  }

  analyzeContext(text, metadata) {
    const context = {
      type: 'general',
      confidence: 0,
      indicators: []
    };

    // Check for context patterns
    Object.entries(this.marketContextPatterns).forEach(([type, regex]) => {
      if (regex.test(text)) {
        context.type = type;
        context.confidence += 0.3;
        context.indicators.push(type);
      }
    });

    // Check metadata for context clues
    if (metadata.source) {
      const sourceContext = this.getSourceContext(metadata.source);
      context.type = sourceContext.type;
      context.confidence += sourceContext.confidence;
      context.indicators.push(`source:${metadata.source}`);
    }

    // Check for time-based context
    const timeContext = this.analyzeTimeContext(text);
    if (timeContext) {
      context.indicators.push(`time:${timeContext}`);
    }

    return context;
  }

  getSourceContext(source) {
    const sourceContexts = {
      'news': { type: 'news', confidence: 0.8 },
      'twitter': { type: 'social', confidence: 0.6 },
      'reddit': { type: 'social', confidence: 0.5 },
      'youtube': { type: 'social', confidence: 0.4 },
      'analyst': { type: 'analyst', confidence: 0.9 },
      'earnings': { type: 'earnings', confidence: 0.9 },
      'press_release': { type: 'official', confidence: 0.95 }
    };

    return sourceContexts[source] || { type: 'general', confidence: 0.3 };
  }

  analyzeTimeContext(text) {
    const timePatterns = {
      'earnings_season': /q[1-4]|quarterly|earnings season/i,
      'pre_market': /pre.?market|before.?market|premarket/i,
      'after_hours': /after.?hours|after.?market|post.?market/i,
      'weekend': /weekend|saturday|sunday/i,
      'holiday': /holiday|christmas|thanksgiving|new year/i
    };

    for (const [context, regex] of Object.entries(timePatterns)) {
      if (regex.test(text)) {
        return context;
      }
    }

    return null;
  }

  analyzeIntensity(text) {
    const tokens = this.tokenizer.tokenize(text);
    let intensityScore = 0;
    let intensityCount = 0;

    // Check for intensity modifiers
    Object.entries(this.intensityModifiers).forEach(([level, modifiers]) => {
      const weight = level === 'high' ? 2 : level === 'medium' ? 1 : 0.5;
      
      modifiers.forEach(modifier => {
        const regex = new RegExp(`\\b${modifier}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          intensityScore += weight * matches.length;
          intensityCount += matches.length;
        }
      });
    });

    // Check for exclamation marks and caps
    const exclamations = (text.match(/!/g) || []).length;
    const caps = (text.match(/[A-Z]{2,}/g) || []).length;
    
    intensityScore += exclamations * 0.5;
    intensityScore += caps * 0.3;
    intensityCount += exclamations + caps;

    const normalizedIntensity = intensityCount > 0 ? intensityScore / intensityCount : 0;

    return {
      score: normalizedIntensity,
      level: this.categorizeIntensity(normalizedIntensity),
      indicators: {
        modifiers: intensityCount,
        exclamations,
        caps
      }
    };
  }

  categorizeIntensity(score) {
    if (score >= 1.5) return 'high';
    if (score >= 0.8) return 'medium';
    if (score >= 0.3) return 'low';
    return 'minimal';
  }

  combineAnalyses(basic, financial, context, intensity) {
    // Weight the different analyses
    const weights = {
      basic: 0.4,
      financial: 0.3,
      context: 0.2,
      intensity: 0.1
    };

    // Adjust weights based on context
    if (financial.hasFinancialContext) {
      weights.financial = 0.5;
      weights.basic = 0.3;
    }

    if (context.confidence > 0.7) {
      weights.context = 0.3;
      weights.basic = 0.3;
    }

    // Calculate weighted score
    const score = 
      (basic.score * weights.basic) +
      (financial.score * weights.financial) +
      (intensity.score * weights.intensity);

    // Normalize to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, score));

    return {
      score: normalizedScore,
      polarity: normalizedScore > 0 ? 'positive' : normalizedScore < 0 ? 'negative' : 'neutral',
      subjectivity: basic.subjectivity
    };
  }

  calculateConfidence(basic, financial, context, intensity) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on analysis quality
    if (financial.hasFinancialContext) confidence += 0.2;
    if (context.confidence > 0.7) confidence += 0.1;
    if (intensity.level !== 'minimal') confidence += 0.1;
    if (basic.words && basic.words.length > 5) confidence += 0.1;

    // Decrease confidence for conflicting signals
    const scoreDiff = Math.abs(basic.score - financial.score);
    if (scoreDiff > 0.5) confidence -= 0.2;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  categorizeSentiment(score) {
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score >= -0.2) return 'neutral';
    if (score >= -0.6) return 'negative';
    return 'very_negative';
  }

  extractKeyPhrases(text) {
    const tokens = this.tokenizer.tokenize(text);
    const phrases = [];
    
    // Extract 2-3 word phrases
    for (let i = 0; i < tokens.length - 1; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      if (this.isRelevantPhrase(phrase)) {
        phrases.push(phrase);
      }
    }

    // Extract 3-word phrases
    for (let i = 0; i < tokens.length - 2; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (this.isRelevantPhrase(phrase)) {
        phrases.push(phrase);
      }
    }

    // Remove duplicates and return top phrases
    return [...new Set(phrases)].slice(0, 10);
  }

  isRelevantPhrase(phrase) {
    // Check if phrase contains financial terms
    const financialTerms = /earnings|revenue|profit|loss|growth|price|stock|market|trading|investment|dividend|yield|return|value|debt|equity|balance|income|quarterly|annual|guidance|outlook|target|rating|upgrade|downgrade|buy|sell|hold|bullish|bearish|rally|crash|surge|plunge|jump|drop|climb|fall|gain|decline|strong|weak|positive|negative|optimistic|pessimistic|beat|miss|exceed|disappoint|breakthrough|milestone|record|high|low|peak|bottom|momentum|breakout|breakdown|resistance|support|volatile|stable|flat|sideways|consolidate|range|trading|mixed|neutral|opportunity|potential|upside|downside|risk|uncertainty|volatility|volatile/i;
    
    return financialTerms.test(phrase) && phrase.length > 5;
  }

  generateInsights(combinedScore, financial, context, keyPhrases) {
    const insights = [];

    // Sentiment strength insight
    if (Math.abs(combinedScore.score) > 0.7) {
      insights.push({
        type: 'sentiment_strength',
        message: `Strong ${combinedScore.polarity} sentiment detected`,
        confidence: 'high'
      });
    }

    // Financial context insight
    if (financial.hasFinancialContext) {
      insights.push({
        type: 'financial_context',
        message: 'Financial terminology detected, high relevance',
        confidence: 'high'
      });
    }

    // Context-specific insights
    if (context.type !== 'general') {
      insights.push({
        type: 'context_specific',
        message: `${context.type} context detected`,
        confidence: context.confidence > 0.7 ? 'high' : 'medium'
      });
    }

    // Key phrases insight
    if (keyPhrases.length > 0) {
      insights.push({
        type: 'key_phrases',
        message: `Key phrases: ${keyPhrases.slice(0, 3).join(', ')}`,
        confidence: 'medium'
      });
    }

    return insights;
  }
}

module.exports = SentimentAnalyzer;
