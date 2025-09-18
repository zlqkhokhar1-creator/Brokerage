const fs = require('fs');
const path = require('path');
const { VM } = require('vm2');
const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { nanoid } = require('nanoid');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
    this.pluginDirectory = path.join(__dirname, '../../plugins');
    this.sandboxConfig = {
      timeout: 5000,
      sandbox: {
        console: {
          log: (...args) => logger.info('Plugin:', ...args),
          error: (...args) => logger.error('Plugin Error:', ...args),
          warn: (...args) => logger.warn('Plugin Warning:', ...args)
        },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        Date: Date,
        Math: Math,
        JSON: JSON,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        RegExp: RegExp,
        Error: Error,
        TypeError: TypeError,
        ReferenceError: ReferenceError,
        RangeError: RangeError,
        SyntaxError: SyntaxError
      }
    };
  }

  async initialize() {
    try {
      // Create plugin directory if it doesn't exist
      if (!fs.existsSync(this.pluginDirectory)) {
        fs.mkdirSync(this.pluginDirectory, { recursive: true });
      }

      // Load built-in plugins
      await this.loadBuiltInPlugins();
      
      // Load custom plugins
      await this.loadCustomPlugins();
      
      logger.info(`PluginManager initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to initialize PluginManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Unload all plugins
      for (const [pluginId, plugin] of this.plugins) {
        try {
          if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
            await plugin.instance.cleanup();
          }
        } catch (error) {
          logger.error(`Error cleaning up plugin ${pluginId}:`, error);
        }
      }
      
      this.plugins.clear();
      logger.info('PluginManager closed');
    } catch (error) {
      logger.error('Error closing PluginManager:', error);
    }
  }

  async loadBuiltInPlugins() {
    const builtInPlugins = [
      'moving-average-crossover',
      'rsi-mean-reversion',
      'bollinger-bands',
      'macd-signal',
      'momentum-strategy',
      'mean-reversion',
      'trend-following',
      'arbitrage',
      'pairs-trading',
      'volatility-breakout'
    ];

    for (const pluginName of builtInPlugins) {
      try {
        const plugin = await this.createBuiltInPlugin(pluginName);
        this.plugins.set(plugin.id, plugin);
        logger.info(`Loaded built-in plugin: ${pluginName}`);
      } catch (error) {
        logger.error(`Failed to load built-in plugin ${pluginName}:`, error);
      }
    }
  }

  async createBuiltInPlugin(pluginName) {
    const pluginId = `builtin_${pluginName}`;
    const pluginCode = this.getBuiltInPluginCode(pluginName);
    
    return {
      id: pluginId,
      name: pluginName,
      type: 'builtin',
      version: '1.0.0',
      description: this.getBuiltInPluginDescription(pluginName),
      author: 'Brokerage Platform Team',
      category: this.getBuiltInPluginCategory(pluginName),
      config: this.getBuiltInPluginConfig(pluginName),
      code: pluginCode,
      instance: null,
      loaded: false,
      createdAt: new Date().toISOString()
    };
  }

  getBuiltInPluginCode(pluginName) {
    const plugins = {
      'moving-average-crossover': `
        class MovingAverageCrossoverStrategy {
          constructor(config) {
            this.shortPeriod = config.shortPeriod || 10;
            this.longPeriod = config.longPeriod || 20;
            this.shortMA = [];
            this.longMA = [];
            this.position = 0;
            this.lastSignal = null;
          }

          initialize(data) {
            this.calculateMovingAverages(data);
          }

          calculateMovingAverages(data) {
            this.shortMA = this.calculateMA(data, this.shortPeriod);
            this.longMA = this.calculateMA(data, this.longPeriod);
          }

          calculateMA(data, period) {
            const ma = [];
            for (let i = period - 1; i < data.length; i++) {
              const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
              ma.push(sum / period);
            }
            return ma;
          }

          onTick(data) {
            if (data.length < this.longPeriod) return null;

            this.calculateMovingAverages(data);
            const currentShort = this.shortMA[this.shortMA.length - 1];
            const currentLong = this.longMA[this.longMA.length - 1];
            const prevShort = this.shortMA[this.shortMA.length - 2];
            const prevLong = this.longMA[this.longMA.length - 2];

            // Bullish crossover
            if (prevShort <= prevLong && currentShort > currentLong) {
              this.lastSignal = 'BUY';
              return { action: 'BUY', confidence: 0.8, reason: 'Golden cross detected' };
            }
            
            // Bearish crossover
            if (prevShort >= prevLong && currentShort < currentLong) {
              this.lastSignal = 'SELL';
              return { action: 'SELL', confidence: 0.8, reason: 'Death cross detected' };
            }

            return null;
          }

          getMetrics() {
            return {
              shortMA: this.shortMA[this.shortMA.length - 1],
              longMA: this.longMA[this.longMA.length - 1],
              lastSignal: this.lastSignal
            };
          }
        }

        module.exports = MovingAverageCrossoverStrategy;
      `,

      'rsi-mean-reversion': `
        class RSIMeanReversionStrategy {
          constructor(config) {
            this.period = config.period || 14;
            this.oversold = config.oversold || 30;
            this.overbought = config.overbought || 70;
            this.rsi = [];
            this.position = 0;
            this.lastSignal = null;
          }

          initialize(data) {
            this.calculateRSI(data);
          }

          calculateRSI(data) {
            this.rsi = [];
            const gains = [];
            const losses = [];

            for (let i = 1; i < data.length; i++) {
              const change = data[i].close - data[i - 1].close;
              gains.push(change > 0 ? change : 0);
              losses.push(change < 0 ? Math.abs(change) : 0);
            }

            for (let i = this.period - 1; i < gains.length; i++) {
              const avgGain = gains.slice(i - this.period + 1, i + 1).reduce((a, b) => a + b, 0) / this.period;
              const avgLoss = losses.slice(i - this.period + 1, i + 1).reduce((a, b) => a + b, 0) / this.period;
              const rs = avgGain / (avgLoss || 0.0001);
              const rsi = 100 - (100 / (1 + rs));
              this.rsi.push(rsi);
            }
          }

          onTick(data) {
            if (data.length < this.period + 1) return null;

            this.calculateRSI(data);
            const currentRSI = this.rsi[this.rsi.length - 1];

            // Oversold - Buy signal
            if (currentRSI < this.oversold) {
              this.lastSignal = 'BUY';
              return { action: 'BUY', confidence: 0.7, reason: \`RSI oversold: \${currentRSI.toFixed(2)}\` };
            }
            
            // Overbought - Sell signal
            if (currentRSI > this.overbought) {
              this.lastSignal = 'SELL';
              return { action: 'SELL', confidence: 0.7, reason: \`RSI overbought: \${currentRSI.toFixed(2)}\` };
            }

            return null;
          }

          getMetrics() {
            return {
              rsi: this.rsi[this.rsi.length - 1],
              lastSignal: this.lastSignal
            };
          }
        }

        module.exports = RSIMeanReversionStrategy;
      `,

      'bollinger-bands': `
        class BollingerBandsStrategy {
          constructor(config) {
            this.period = config.period || 20;
            this.stdDev = config.stdDev || 2;
            this.upperBand = [];
            this.lowerBand = [];
            this.middleBand = [];
            this.position = 0;
            this.lastSignal = null;
          }

          initialize(data) {
            this.calculateBollingerBands(data);
          }

          calculateBollingerBands(data) {
            this.upperBand = [];
            this.lowerBand = [];
            this.middleBand = [];

            for (let i = this.period - 1; i < data.length; i++) {
              const slice = data.slice(i - this.period + 1, i + 1);
              const prices = slice.map(d => d.close);
              const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
              const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
              const stdDev = Math.sqrt(variance);

              this.middleBand.push(mean);
              this.upperBand.push(mean + (this.stdDev * stdDev));
              this.lowerBand.push(mean - (this.stdDev * stdDev));
            }
          }

          onTick(data) {
            if (data.length < this.period) return null;

            this.calculateBollingerBands(data);
            const currentPrice = data[data.length - 1].close;
            const currentUpper = this.upperBand[this.upperBand.length - 1];
            const currentLower = this.lowerBand[this.lowerBand.length - 1];
            const currentMiddle = this.middleBand[this.middleBand.length - 1];

            // Price touches lower band - Buy signal
            if (currentPrice <= currentLower) {
              this.lastSignal = 'BUY';
              return { action: 'BUY', confidence: 0.75, reason: 'Price touched lower Bollinger Band' };
            }
            
            // Price touches upper band - Sell signal
            if (currentPrice >= currentUpper) {
              this.lastSignal = 'SELL';
              return { action: 'SELL', confidence: 0.75, reason: 'Price touched upper Bollinger Band' };
            }

            return null;
          }

          getMetrics() {
            return {
              upperBand: this.upperBand[this.upperBand.length - 1],
              lowerBand: this.lowerBand[this.lowerBand.length - 1],
              middleBand: this.middleBand[this.middleBand.length - 1],
              lastSignal: this.lastSignal
            };
          }
        }

        module.exports = BollingerBandsStrategy;
      `
    };

    return plugins[pluginName] || '';
  }

  getBuiltInPluginDescription(pluginName) {
    const descriptions = {
      'moving-average-crossover': 'Strategy based on moving average crossover signals',
      'rsi-mean-reversion': 'Mean reversion strategy using RSI indicator',
      'bollinger-bands': 'Strategy using Bollinger Bands for entry and exit signals',
      'macd-signal': 'Strategy based on MACD signal line crossovers',
      'momentum-strategy': 'Momentum-based trading strategy',
      'mean-reversion': 'General mean reversion strategy',
      'trend-following': 'Trend following strategy',
      'arbitrage': 'Arbitrage opportunity detection',
      'pairs-trading': 'Pairs trading strategy',
      'volatility-breakout': 'Volatility breakout strategy'
    };
    return descriptions[pluginName] || 'Built-in trading strategy';
  }

  getBuiltInPluginCategory(pluginName) {
    const categories = {
      'moving-average-crossover': 'trend',
      'rsi-mean-reversion': 'mean-reversion',
      'bollinger-bands': 'volatility',
      'macd-signal': 'trend',
      'momentum-strategy': 'momentum',
      'mean-reversion': 'mean-reversion',
      'trend-following': 'trend',
      'arbitrage': 'arbitrage',
      'pairs-trading': 'pairs',
      'volatility-breakout': 'volatility'
    };
    return categories[pluginName] || 'general';
  }

  getBuiltInPluginConfig(pluginName) {
    const configs = {
      'moving-average-crossover': {
        shortPeriod: { type: 'number', default: 10, min: 5, max: 50 },
        longPeriod: { type: 'number', default: 20, min: 10, max: 100 }
      },
      'rsi-mean-reversion': {
        period: { type: 'number', default: 14, min: 5, max: 30 },
        oversold: { type: 'number', default: 30, min: 10, max: 40 },
        overbought: { type: 'number', default: 70, min: 60, max: 90 }
      },
      'bollinger-bands': {
        period: { type: 'number', default: 20, min: 10, max: 50 },
        stdDev: { type: 'number', default: 2, min: 1, max: 3 }
      }
    };
    return configs[pluginName] || {};
  }

  async loadCustomPlugins() {
    try {
      const files = fs.readdirSync(this.pluginDirectory);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      for (const file of jsFiles) {
        try {
          const pluginPath = path.join(this.pluginDirectory, file);
          const pluginCode = fs.readFileSync(pluginPath, 'utf8');
          const plugin = await this.createCustomPlugin(file, pluginCode);
          this.plugins.set(plugin.id, plugin);
          logger.info(`Loaded custom plugin: ${file}`);
        } catch (error) {
          logger.error(`Failed to load custom plugin ${file}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error loading custom plugins:', error);
    }
  }

  async createCustomPlugin(filename, code) {
    const pluginId = `custom_${filename.replace('.js', '')}`;
    
    return {
      id: pluginId,
      name: filename.replace('.js', ''),
      type: 'custom',
      version: '1.0.0',
      description: 'Custom trading strategy plugin',
      author: 'Unknown',
      category: 'custom',
      config: {},
      code: code,
      instance: null,
      loaded: false,
      createdAt: new Date().toISOString()
    };
  }

  async loadPlugin(pluginId, config = {}) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (plugin.loaded) {
        return plugin;
      }

      // Create VM instance
      const vm = new VM(this.sandboxConfig);
      
      // Execute plugin code
      const StrategyClass = vm.run(plugin.code);
      
      // Create plugin instance
      const instance = new StrategyClass(config);
      
      // Validate plugin interface
      this.validatePlugin(instance);
      
      // Update plugin
      plugin.instance = instance;
      plugin.loaded = true;
      plugin.config = config;
      
      this.plugins.set(pluginId, plugin);
      
      logger.info(`Plugin loaded: ${pluginId}`);
      this.emit('pluginLoaded', plugin);
      
      return plugin;
    } catch (error) {
      logger.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (plugin.loaded && plugin.instance) {
        if (typeof plugin.instance.cleanup === 'function') {
          await plugin.instance.cleanup();
        }
        plugin.instance = null;
        plugin.loaded = false;
      }

      this.plugins.set(pluginId, plugin);
      
      logger.info(`Plugin unloaded: ${pluginId}`);
      this.emit('pluginUnloaded', plugin);
      
      return plugin;
    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  validatePlugin(instance) {
    const requiredMethods = ['initialize', 'onTick', 'getMetrics'];
    
    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        throw new Error(`Plugin must implement ${method} method`);
      }
    }
  }

  getAvailablePlugins() {
    return Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      category: plugin.category,
      config: plugin.config,
      loaded: plugin.loaded,
      createdAt: plugin.createdAt
    }));
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  async createPlugin(name, description, code, config = {}) {
    try {
      const pluginId = `custom_${nanoid()}`;
      const plugin = {
        id: pluginId,
        name,
        type: 'custom',
        version: '1.0.0',
        description,
        author: 'User',
        category: 'custom',
        config,
        code,
        instance: null,
        loaded: false,
        createdAt: new Date().toISOString()
      };

      this.plugins.set(pluginId, plugin);
      
      // Save to file
      const filename = `${name.replace(/\s+/g, '-').toLowerCase()}.js`;
      const filepath = path.join(this.pluginDirectory, filename);
      fs.writeFileSync(filepath, code);
      
      logger.info(`Custom plugin created: ${pluginId}`);
      this.emit('pluginCreated', plugin);
      
      return plugin;
    } catch (error) {
      logger.error('Failed to create plugin:', error);
      throw error;
    }
  }

  async deletePlugin(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (plugin.type === 'custom') {
        // Delete file
        const filename = `${plugin.name.replace(/\s+/g, '-').toLowerCase()}.js`;
        const filepath = path.join(this.pluginDirectory, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }

      this.plugins.delete(pluginId);
      
      logger.info(`Plugin deleted: ${pluginId}`);
      this.emit('pluginDeleted', plugin);
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete plugin ${pluginId}:`, error);
      throw error;
    }
  }
}

module.exports = PluginManager;
