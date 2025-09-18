const axios = require('axios');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class DataCollector {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.sources = {
      news: {
        enabled: true,
        apiKey: process.env.NEWS_API_KEY,
        url: 'https://newsapi.org/v2/everything',
        interval: 60000, // 1 minute
        lastRun: 0
      },
      twitter: {
        enabled: process.env.TWITTER_API_KEY ? true : false,
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
        interval: 30000, // 30 seconds
        lastRun: 0
      },
      reddit: {
        enabled: process.env.REDDIT_CLIENT_ID ? true : false,
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        interval: 120000, // 2 minutes
        lastRun: 0
      },
      youtube: {
        enabled: process.env.YOUTUBE_API_KEY ? true : false,
        apiKey: process.env.YOUTUBE_API_KEY,
        interval: 300000, // 5 minutes
        lastRun: 0
      }
    };

    this.symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
      'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'ARKK', 'TQQQ', 'SQQQ', 'UVXY', 'VIX'
    ];
  }

  async initialize() {
    try {
      await this.redis.ping();
      logger.info('DataCollector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataCollector:', error);
      throw error;
    }
  }

  async collectAllData() {
    const promises = [];

    // Collect from each enabled source
    Object.entries(this.sources).forEach(([sourceName, config]) => {
      if (config.enabled && this.shouldRun(config)) {
        promises.push(this.collectFromSource(sourceName, config));
      }
    });

    // Collect data for each symbol
    this.symbols.forEach(symbol => {
      promises.push(this.collectSymbolData(symbol));
    });

    try {
      await Promise.allSettled(promises);
      logger.info('Data collection completed for all sources');
    } catch (error) {
      logger.error('Error in data collection:', error);
    }
  }

  shouldRun(config) {
    const now = Date.now();
    return (now - config.lastRun) >= config.interval;
  }

  async collectFromSource(sourceName, config) {
    try {
      config.lastRun = Date.now();
      
      switch (sourceName) {
        case 'news':
          await this.collectNewsData(config);
          break;
        case 'twitter':
          await this.collectTwitterData(config);
          break;
        case 'reddit':
          await this.collectRedditData(config);
          break;
        case 'youtube':
          await this.collectYouTubeData(config);
          break;
        default:
          logger.warn(`Unknown source: ${sourceName}`);
      }
    } catch (error) {
      logger.error(`Error collecting data from ${sourceName}:`, error);
    }
  }

  async collectNewsData(config) {
    if (!config.apiKey) {
      logger.warn('News API key not configured');
      return;
    }

    try {
      for (const symbol of this.symbols) {
        const response = await axios.get(config.url, {
          params: {
            q: symbol,
            apiKey: config.apiKey,
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 20,
            from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          timeout: 10000
        });

        const articles = response.data.articles || [];
        
        for (const article of articles) {
          await this.storeDataItem({
            text: `${article.title} ${article.description || ''}`,
            symbol,
            source: 'news',
            metadata: {
              url: article.url,
              publishedAt: article.publishedAt,
              source: article.source.name,
              author: article.author
            }
          });
        }

        // Rate limiting
        await this.delay(100);
      }
    } catch (error) {
      logger.error('Error collecting news data:', error);
    }
  }

  async collectTwitterData(config) {
    if (!config.bearerToken) {
      logger.warn('Twitter Bearer Token not configured');
      return;
    }

    try {
      for (const symbol of this.symbols) {
        const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
          headers: {
            'Authorization': `Bearer ${config.bearerToken}`
          },
          params: {
            query: `$${symbol} -is:retweet lang:en`,
            max_results: 50,
            'tweet.fields': 'created_at,public_metrics,context_annotations'
          },
          timeout: 10000
        });

        const tweets = response.data.data || [];
        
        for (const tweet of tweets) {
          await this.storeDataItem({
            text: tweet.text,
            symbol,
            source: 'twitter',
            metadata: {
              tweetId: tweet.id,
              createdAt: tweet.created_at,
              metrics: tweet.public_metrics,
              annotations: tweet.context_annotations
            }
          });
        }

        // Rate limiting
        await this.delay(200);
      }
    } catch (error) {
      logger.error('Error collecting Twitter data:', error);
    }
  }

  async collectRedditData(config) {
    if (!config.clientId || !config.clientSecret) {
      logger.warn('Reddit API credentials not configured');
      return;
    }

    try {
      // Get Reddit access token
      const tokenResponse = await axios.post('https://www.reddit.com/api/v1/access_token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Collect from relevant subreddits
      const subreddits = ['stocks', 'investing', 'SecurityAnalysis', 'ValueInvesting', 'options'];
      
      for (const subreddit of subreddits) {
        const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/hot`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'SentimentEngine/1.0'
          },
          params: {
            limit: 25
          },
          timeout: 10000
        });

        const posts = response.data.data.children || [];
        
        for (const post of posts) {
          const postData = post.data;
          const text = `${postData.title} ${postData.selftext || ''}`;
          
          // Check if post mentions any of our symbols
          const mentionedSymbols = this.symbols.filter(symbol => 
            text.toUpperCase().includes(symbol)
          );

          for (const symbol of mentionedSymbols) {
            await this.storeDataItem({
              text,
              symbol,
              source: 'reddit',
              metadata: {
                subreddit,
                postId: postData.id,
                author: postData.author,
                score: postData.score,
                numComments: postData.num_comments,
                created: postData.created_utc,
                url: `https://reddit.com${postData.permalink}`
              }
            });
          }
        }

        // Rate limiting
        await this.delay(1000);
      }
    } catch (error) {
      logger.error('Error collecting Reddit data:', error);
    }
  }

  async collectYouTubeData(config) {
    if (!config.apiKey) {
      logger.warn('YouTube API key not configured');
      return;
    }

    try {
      for (const symbol of this.symbols) {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: `${symbol} stock analysis`,
            type: 'video',
            order: 'relevance',
            maxResults: 10,
            publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            key: config.apiKey
          },
          timeout: 10000
        });

        const videos = response.data.items || [];
        
        for (const video of videos) {
          await this.storeDataItem({
            text: `${video.snippet.title} ${video.snippet.description}`,
            symbol,
            source: 'youtube',
            metadata: {
              videoId: video.id.videoId,
              channelTitle: video.snippet.channelTitle,
              publishedAt: video.snippet.publishedAt,
              thumbnails: video.snippet.thumbnails,
              url: `https://www.youtube.com/watch?v=${video.id.videoId}`
            }
          });
        }

        // Rate limiting
        await this.delay(200);
      }
    } catch (error) {
      logger.error('Error collecting YouTube data:', error);
    }
  }

  async collectSymbolData(symbol) {
    try {
      // Collect from financial data APIs
      const financialData = await this.collectFinancialData(symbol);
      
      if (financialData) {
        await this.storeDataItem({
          text: financialData.description || '',
          symbol,
          source: 'financial',
          metadata: {
            price: financialData.price,
            change: financialData.change,
            changePercent: financialData.changePercent,
            volume: financialData.volume,
            marketCap: financialData.marketCap,
            pe: financialData.pe,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error(`Error collecting data for ${symbol}:`, error);
    }
  }

  async collectFinancialData(symbol) {
    try {
      // This would integrate with financial data providers like Alpha Vantage, IEX, etc.
      // For now, return mock data
      return {
        description: `Financial data for ${symbol}`,
        price: Math.random() * 1000,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        marketCap: Math.floor(Math.random() * 1000000000),
        pe: Math.random() * 50
      };
    } catch (error) {
      logger.error(`Error collecting financial data for ${symbol}:`, error);
      return null;
    }
  }

  async storeDataItem(data) {
    try {
      const itemId = `sentiment:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      await this.redis.hset(itemId, {
        text: data.text,
        symbol: data.symbol,
        source: data.source,
        metadata: JSON.stringify(data.metadata || {}),
        userId: data.userId || null,
        timestamp: new Date().toISOString()
      });

      // Add to pending queue
      await this.redis.hset(`sentiment:pending:${itemId}`, {
        text: data.text,
        symbol: data.symbol,
        source: data.source,
        metadata: JSON.stringify(data.metadata || {}),
        userId: data.userId || null,
        timestamp: new Date().toISOString()
      });

      // Set expiration (24 hours)
      await this.redis.expire(itemId, 86400);
      await this.redis.expire(`sentiment:pending:${itemId}`, 86400);

      logger.debug(`Stored data item: ${itemId}`, {
        symbol: data.symbol,
        source: data.source,
        textLength: data.text.length
      });

    } catch (error) {
      logger.error('Error storing data item:', error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DataCollector;
