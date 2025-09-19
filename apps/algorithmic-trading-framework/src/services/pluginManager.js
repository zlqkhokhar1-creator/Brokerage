const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const vm = require('vm2');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
    this.pluginDirectory = path.join(__dirname, '../../plugins');
    this.redis = null;
    this.db = null;
    this.vm = new vm.NodeVM({
      require: {
        external: ['lodash', 'moment', 'mathjs', 'technicalindicators'],
        builtin: ['crypto', 'util', 'events']
      },
      sandbox: {
        console: {
          log: (...args) => logger.info('Plugin:', ...args),
          error: (...args) => logger.error('Plugin Error:', ...args),
          warn: (...args) => logger.warn('Plugin Warning:', ...args)
        }
      }
    });
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadBuiltInPlugins();
      await this.scanPluginDirectory();
      logger.info('Plugin Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Plugin Manager:', error);
      throw error;
    }
  }

  async loadBuiltInPlugins() {
    const builtInPlugins = [
      {
        id: 'moving-average-crossover',
        name: 'Moving Average Crossover',
        version: '1.0.0',
        description: 'Simple moving average crossover strategy',
        author: 'Brokerage Platform',
        category: 'trend-following',
        config: {
          shortPeriod: { type: 'number', default: 10, min: 5, max: 50 },
          longPeriod: { type: 'number', default: 20, min: 10, max: 200 },
          symbol: { type: 'string', required: true }
        },
        code: `
          class MovingAverageCrossover {
            constructor(config) {
              this.shortPeriod = config.shortPeriod || 10;
              this.longPeriod = config.longPeriod || 20;
              this.shortMA = [];
              this.longMA = [];
              this.position = 0;
              this.initialized = false;
            }

            initialize() {
              this.initialized = true;
              return { success: true, message: 'Strategy initialized' };
            }

            onData(data) {
              if (!this.initialized) return null;

              const price = data.close;
              this.shortMA.push(price);
              this.longMA.push(price);

              if (this.shortMA.length > this.shortPeriod) {
                this.shortMA.shift();
              }
              if (this.longMA.length > this.longPeriod) {
                this.longMA.shift();
              }

              if (this.shortMA.length < this.shortPeriod || this.longMA.length < this.longPeriod) {
                return null;
              }

              const shortAvg = this.shortMA.reduce((a, b) => a + b) / this.shortMA.length;
              const longAvg = this.longMA.reduce((a, b) => a + b) / this.longMA.length;

              if (shortAvg > longAvg && this.position <= 0) {
                this.position = 1;
                return { action: 'BUY', quantity: 100, reason: 'Golden cross detected' };
              } else if (shortAvg < longAvg && this.position >= 0) {
                this.position = -1;
                return { action: 'SELL', quantity: 100, reason: 'Death cross detected' };
              }

              return null;
            }

            getState() {
              return {
                position: this.position,
                shortMA: this.shortMA.slice(-5),
                longMA: this.longMA.slice(-5),
                initialized: this.initialized
              };
            }
          }

          module.exports = MovingAverageCrossover;
        `
      },
      {
        id: 'rsi-mean-reversion',
        name: 'RSI Mean Reversion',
        version: '1.0.0',
        description: 'RSI-based mean reversion strategy',
        author: 'Brokerage Platform',
        category: 'mean-reversion',
        config: {
          period: { type: 'number', default: 14, min: 5, max: 50 },
          oversold: { type: 'number', default: 30, min: 10, max: 40 },
          overbought: { type: 'number', default: 70, min: 60, max: 90 },
          symbol: { type: 'string', required: true }
        },
        code: `
          class RSIMeanReversion {
            constructor(config) {
              this.period = config.period || 14;
              this.oversold = config.oversold || 30;
              this.overbought = config.overbought || 70;
              this.prices = [];
              this.gains = [];
              this.losses = [];
              this.position = 0;
              this.initialized = false;
            }

            initialize() {
              this.initialized = true;
              return { success: true, message: 'Strategy initialized' };
            }

            calculateRSI() {
              if (this.gains.length < this.period) return null;

              const avgGain = this.gains.slice(-this.period).reduce((a, b) => a + b) / this.period;
              const avgLoss = this.losses.slice(-this.period).reduce((a, b) => a + b) / this.period;

              if (avgLoss === 0) return 100;

              const rs = avgGain / avgLoss;
              return 100 - (100 / (1 + rs));
            }

            onData(data) {
              if (!this.initialized) return null;

              const price = data.close;
              this.prices.push(price);

              if (this.prices.length > 1) {
                const change = price - this.prices[this.prices.length - 2];
                this.gains.push(change > 0 ? change : 0);
                this.losses.push(change < 0 ? Math.abs(change) : 0);
              }

              if (this.gains.length > this.period) {
                this.gains.shift();
                this.losses.shift();
              }

              if (this.prices.length > this.period) {
                this.prices.shift();
              }

              if (this.gains.length < this.period) return null;

              const rsi = this.calculateRSI();
              if (rsi === null) return null;

              if (rsi < this.oversold && this.position <= 0) {
                this.position = 1;
                return { action: 'BUY', quantity: 100, reason: \`RSI oversold: \${rsi.toFixed(2)}\` };
              } else if (rsi > this.overbought && this.position >= 0) {
                this.position = -1;
                return { action: 'SELL', quantity: 100, reason: \`RSI overbought: \${rsi.toFixed(2)}\` };
              }

              return null;
            }

            getState() {
              return {
                position: this.position,
                rsi: this.calculateRSI(),
                initialized: this.initialized
              };
            }
          }

          module.exports = RSIMeanReversion;
        `
      },
      {
        id: 'bollinger-bands',
        name: 'Bollinger Bands Strategy',
        version: '1.0.0',
        description: 'Bollinger Bands mean reversion strategy',
        author: 'Brokerage Platform',
        category: 'mean-reversion',
        config: {
          period: { type: 'number', default: 20, min: 10, max: 50 },
          stdDev: { type: 'number', default: 2, min: 1, max: 3 },
          symbol: { type: 'string', required: true }
        },
        code: `
          class BollingerBands {
            constructor(config) {
              this.period = config.period || 20;
              this.stdDev = config.stdDev || 2;
              this.prices = [];
              this.position = 0;
              this.initialized = false;
            }

            initialize() {
              this.initialized = true;
              return { success: true, message: 'Strategy initialized' };
            }

            calculateBollingerBands() {
              if (this.prices.length < this.period) return null;

              const recentPrices = this.prices.slice(-this.period);
              const sma = recentPrices.reduce((a, b) => a + b) / recentPrices.length;
              
              const variance = recentPrices.reduce((sum, price) => {
                return sum + Math.pow(price - sma, 2);
              }, 0) / recentPrices.length;
              
              const stdDev = Math.sqrt(variance);
              
              return {
                upper: sma + (this.stdDev * stdDev),
                middle: sma,
                lower: sma - (this.stdDev * stdDev)
              };
            }

            onData(data) {
              if (!this.initialized) return null;

              const price = data.close;
              this.prices.push(price);

              if (this.prices.length > this.period) {
                this.prices.shift();
              }

              if (this.prices.length < this.period) return null;

              const bands = this.calculateBollingerBands();
              if (!bands) return null;

              if (price <= bands.lower && this.position <= 0) {
                this.position = 1;
                return { action: 'BUY', quantity: 100, reason: \`Price below lower band: \${price.toFixed(2)} < \${bands.lower.toFixed(2)}\` };
              } else if (price >= bands.upper && this.position >= 0) {
                this.position = -1;
                return { action: 'SELL', quantity: 100, reason: \`Price above upper band: \${price.toFixed(2)} > \${bands.upper.toFixed(2)}\` };
              }

              return null;
            }

            getState() {
              const bands = this.calculateBollingerBands();
              return {
                position: this.position,
                bands: bands,
                initialized: this.initialized
              };
            }
          }

          module.exports = BollingerBands;
        `
      }
    ];

    for (const plugin of builtInPlugins) {
      this.plugins.set(plugin.id, plugin);
    }

    logger.info(`Loaded ${builtInPlugins.length} built-in plugins`);
  }

  async scanPluginDirectory() {
    try {
      const files = await fs.readdir(this.pluginDirectory);
      const pluginFiles = files.filter(file => file.endsWith('.js'));

      for (const file of pluginFiles) {
        try {
          const pluginPath = path.join(this.pluginDirectory, file);
          const pluginCode = await fs.readFile(pluginPath, 'utf8');
          const plugin = this.parsePluginCode(pluginCode, file);
          if (plugin) {
            this.plugins.set(plugin.id, plugin);
          }
        } catch (error) {
          logger.error(`Failed to load plugin ${file}:`, error);
        }
      }

      logger.info(`Scanned plugin directory, found ${pluginFiles.length} files`);
    } catch (error) {
      logger.warn('Plugin directory not found, using built-in plugins only');
    }
  }

  parsePluginCode(code, filename) {
    try {
      // Extract metadata from comments
      const metadataMatch = code.match(/\/\*\*[\s\S]*?\*\//);
      if (!metadataMatch) return null;

      const metadata = metadataMatch[0];
      const idMatch = metadata.match(/@id\s+(\S+)/);
      const nameMatch = metadata.match(/@name\s+(.+)/);
      const versionMatch = metadata.match(/@version\s+(\S+)/);
      const descriptionMatch = metadata.match(/@description\s+(.+)/);
      const authorMatch = metadata.match(/@author\s+(.+)/);
      const categoryMatch = metadata.match(/@category\s+(\S+)/);

      if (!idMatch) return null;

      return {
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : filename.replace('.js', ''),
        version: versionMatch ? versionMatch[1] : '1.0.0',
        description: descriptionMatch ? descriptionMatch[1] : '',
        author: authorMatch ? authorMatch[1] : 'Unknown',
        category: categoryMatch ? categoryMatch[1] : 'custom',
        code: code,
        filename: filename
      };
    } catch (error) {
      logger.error(`Failed to parse plugin ${filename}:`, error);
      return null;
    }
  }

  async getAvailablePlugins() {
    const plugins = Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      category: plugin.category,
      config: plugin.config
    }));

    return plugins;
  }

  async loadPlugin(pluginId, config = {}) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Validate config
      if (plugin.config) {
        this.validateConfig(config, plugin.config);
      }

      // Create plugin instance
      const PluginClass = this.vm.run(plugin.code);
      const instance = new PluginClass(config);

      // Initialize plugin
      const initResult = instance.initialize();
      if (!initResult.success) {
        throw new Error(`Plugin initialization failed: ${initResult.message}`);
      }

      // Store plugin instance
      const pluginInstance = {
        id: pluginId,
        instance: instance,
        config: config,
        loadedAt: new Date(),
        status: 'loaded'
      };

      await this.redis.setex(`plugin:${pluginId}`, 3600, JSON.stringify(pluginInstance));

      logger.info(`Plugin ${pluginId} loaded successfully`);
      this.emit('pluginLoaded', pluginInstance);

      return {
        id: pluginId,
        name: plugin.name,
        status: 'loaded',
        loadedAt: pluginInstance.loadedAt
      };
    } catch (error) {
      logger.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId) {
    try {
      await this.redis.del(`plugin:${pluginId}`);
      logger.info(`Plugin ${pluginId} unloaded successfully`);
      this.emit('pluginUnloaded', { id: pluginId });
      return true;
    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async getPluginInstance(pluginId) {
    try {
      const pluginData = await this.redis.get(`plugin:${pluginId}`);
      if (!pluginData) {
        throw new Error(`Plugin ${pluginId} not loaded`);
      }

      return JSON.parse(pluginData);
    } catch (error) {
      logger.error(`Failed to get plugin instance ${pluginId}:`, error);
      throw error;
    }
  }

  validateConfig(config, schema) {
    for (const [key, definition] of Object.entries(schema)) {
      const value = config[key];

      if (definition.required && (value === undefined || value === null)) {
        throw new Error(`Required config parameter '${key}' is missing`);
      }

      if (value !== undefined && value !== null) {
        if (definition.type === 'number') {
          if (typeof value !== 'number') {
            throw new Error(`Config parameter '${key}' must be a number`);
          }
          if (definition.min !== undefined && value < definition.min) {
            throw new Error(`Config parameter '${key}' must be >= ${definition.min}`);
          }
          if (definition.max !== undefined && value > definition.max) {
            throw new Error(`Config parameter '${key}' must be <= ${definition.max}`);
          }
        } else if (definition.type === 'string') {
          if (typeof value !== 'string') {
            throw new Error(`Config parameter '${key}' must be a string`);
          }
        }
      }
    }
  }

  async close() {
    try {
      // Unload all plugins
      const pluginKeys = await this.redis.keys('plugin:*');
      for (const key of pluginKeys) {
        await this.redis.del(key);
      }

      logger.info('Plugin Manager closed successfully');
    } catch (error) {
      logger.error('Error closing Plugin Manager:', error);
    }
  }
}

module.exports = PluginManager;