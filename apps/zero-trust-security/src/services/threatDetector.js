const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ThreatDetector extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.threats = new Map();
    this.threatPatterns = new Map();
    this.threatRules = new Map();
    this.anomalyDetectors = new Map();
    this.behavioralProfiles = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load threat patterns
      await this.loadThreatPatterns();
      
      // Load threat rules
      await this.loadThreatRules();
      
      // Load anomaly detectors
      await this.loadAnomalyDetectors();
      
      // Load behavioral profiles
      await this.loadBehavioralProfiles();
      
      this._initialized = true;
      logger.info('ThreatDetector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ThreatDetector:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ThreatDetector closed');
    } catch (error) {
      logger.error('Error closing ThreatDetector:', error);
    }
  }

  async loadThreatPatterns() {
    try {
      const result = await pool.query(`
        SELECT * FROM threat_patterns
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const pattern of result.rows) {
        this.threatPatterns.set(pattern.id, {
          ...pattern,
          conditions: pattern.conditions ? JSON.parse(pattern.conditions) : [],
          actions: pattern.actions ? JSON.parse(pattern.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} threat patterns`);
    } catch (error) {
      logger.error('Error loading threat patterns:', error);
      throw error;
    }
  }

  async loadThreatRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM threat_rules
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const rule of result.rows) {
        this.threatRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} threat rules`);
    } catch (error) {
      logger.error('Error loading threat rules:', error);
      throw error;
    }
  }

  async loadAnomalyDetectors() {
    try {
      const result = await pool.query(`
        SELECT * FROM anomaly_detectors
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const detector of result.rows) {
        this.anomalyDetectors.set(detector.id, {
          ...detector,
          config: detector.config ? JSON.parse(detector.config) : {},
          thresholds: detector.thresholds ? JSON.parse(detector.thresholds) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} anomaly detectors`);
    } catch (error) {
      logger.error('Error loading anomaly detectors:', error);
      throw error;
    }
  }

  async loadBehavioralProfiles() {
    try {
      const result = await pool.query(`
        SELECT * FROM behavioral_profiles
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const profile of result.rows) {
        this.behavioralProfiles.set(profile.user_id, {
          ...profile,
          patterns: profile.patterns ? JSON.parse(profile.patterns) : {},
          thresholds: profile.thresholds ? JSON.parse(profile.thresholds) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} behavioral profiles`);
    } catch (error) {
      logger.error('Error loading behavioral profiles:', error);
      throw error;
    }
  }

  async detectAllThreats() {
    try {
      const activePatterns = Array.from(this.threatPatterns.values()).filter(p => p.is_active);
      const activeRules = Array.from(this.threatRules.values()).filter(r => r.is_active);
      const activeDetectors = Array.from(this.anomalyDetectors.values()).filter(d => d.is_active);
      
      let totalThreats = 0;
      let totalPatterns = 0;
      let totalRules = 0;
      let totalAnomalies = 0;
      
      // Detect threats using patterns
      for (const pattern of activePatterns) {
        try {
          const threats = await this.detectThreatsByPattern(pattern);
          totalThreats += threats.length;
          totalPatterns += threats.length;
        } catch (error) {
          logger.error(`Error detecting threats by pattern ${pattern.id}:`, error);
        }
      }
      
      // Detect threats using rules
      for (const rule of activeRules) {
        try {
          const threats = await this.detectThreatsByRule(rule);
          totalThreats += threats.length;
          totalRules += threats.length;
        } catch (error) {
          logger.error(`Error detecting threats by rule ${rule.id}:`, error);
        }
      }
      
      // Detect anomalies
      for (const detector of activeDetectors) {
        try {
          const anomalies = await this.detectAnomalies(detector);
          totalThreats += anomalies.length;
          totalAnomalies += anomalies.length;
        } catch (error) {
          logger.error(`Error detecting anomalies with detector ${detector.id}:`, error);
        }
      }
      
      logger.info('Threat detection completed', {
        totalThreats,
        totalPatterns,
        totalRules,
        totalAnomalies
      });
      
      return {
        totalThreats,
        totalPatterns,
        totalRules,
        totalAnomalies
      };
    } catch (error) {
      logger.error('Error detecting all threats:', error);
      throw error;
    }
  }

  async detectThreatsByPattern(pattern) {
    try {
      const threats = [];
      const { conditions, actions } = pattern;
      
      // Get recent events to analyze
      const events = await this.getRecentEvents(pattern.timeWindow || '24h');
      
      for (const event of events) {
        if (await this.matchesPattern(event, conditions)) {
          const threat = await this.createThreat({
            type: 'pattern',
            patternId: pattern.id,
            patternName: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            event: event,
            conditions: conditions,
            actions: actions
          });
          
          threats.push(threat);
          
          // Execute actions
          await this.executeThreatActions(threat, actions);
        }
      }
      
      return threats;
    } catch (error) {
      logger.error('Error detecting threats by pattern:', error);
      return [];
    }
  }

  async detectThreatsByRule(rule) {
    try {
      const threats = [];
      const { conditions, actions } = rule;
      
      // Get recent events to analyze
      const events = await this.getRecentEvents(rule.timeWindow || '24h');
      
      for (const event of events) {
        if (await this.matchesRule(event, conditions)) {
          const threat = await this.createThreat({
            type: 'rule',
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            description: rule.description,
            event: event,
            conditions: conditions,
            actions: actions
          });
          
          threats.push(threat);
          
          // Execute actions
          await this.executeThreatActions(threat, actions);
        }
      }
      
      return threats;
    } catch (error) {
      logger.error('Error detecting threats by rule:', error);
      return [];
    }
  }

  async detectAnomalies(detector) {
    try {
      const anomalies = [];
      const { type, config, thresholds } = detector;
      
      switch (type) {
        case 'statistical':
          anomalies.push(...await this.detectStatisticalAnomalies(config, thresholds));
          break;
        case 'behavioral':
          anomalies.push(...await this.detectBehavioralAnomalies(config, thresholds));
          break;
        case 'network':
          anomalies.push(...await this.detectNetworkAnomalies(config, thresholds));
          break;
        case 'temporal':
          anomalies.push(...await this.detectTemporalAnomalies(config, thresholds));
          break;
        default:
          logger.warn(`Unknown anomaly detector type: ${type}`);
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return [];
    }
  }

  async detectStatisticalAnomalies(config, thresholds) {
    try {
      const anomalies = [];
      const { field, method, window } = config;
      const { zScore, percentile } = thresholds;
      
      // Get data for analysis
      const data = await this.getDataForAnalysis(field, window);
      
      if (data.length < 10) {
        return anomalies; // Need enough data for statistical analysis
      }
      
      // Calculate statistics
      const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Detect anomalies
      for (const point of data) {
        const value = point[field];
        if (value === null || value === undefined) continue;
        
        const zScoreValue = Math.abs((value - mean) / stdDev);
        
        if (zScoreValue > zScore) {
          const anomaly = await this.createThreat({
            type: 'statistical_anomaly',
            detectorId: config.detectorId,
            severity: this.calculateSeverity(zScoreValue, zScore),
            description: `Statistical anomaly detected in ${field}: z-score ${zScoreValue.toFixed(2)}`,
            field: field,
            value: value,
            mean: mean,
            stdDev: stdDev,
            zScore: zScoreValue,
            threshold: zScore
          });
          
          anomalies.push(anomaly);
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting statistical anomalies:', error);
      return [];
    }
  }

  async detectBehavioralAnomalies(config, thresholds) {
    try {
      const anomalies = [];
      const { userId, behaviorType, window } = config;
      const { deviationThreshold, frequencyThreshold } = thresholds;
      
      // Get user's behavioral profile
      const profile = this.behavioralProfiles.get(userId);
      if (!profile) {
        return anomalies; // No profile to compare against
      }
      
      // Get recent behavior data
      const behaviorData = await this.getBehaviorData(userId, behaviorType, window);
      
      if (behaviorData.length < 5) {
        return anomalies; // Need enough data for behavioral analysis
      }
      
      // Analyze behavior patterns
      const patterns = this.analyzeBehaviorPatterns(behaviorData);
      const deviations = this.calculateBehaviorDeviations(patterns, profile.patterns);
      
      for (const deviation of deviations) {
        if (deviation.score > deviationThreshold) {
          const anomaly = await this.createThreat({
            type: 'behavioral_anomaly',
            detectorId: config.detectorId,
            userId: userId,
            severity: this.calculateSeverity(deviation.score, deviationThreshold),
            description: `Behavioral anomaly detected: ${deviation.type} deviation score ${deviation.score.toFixed(2)}`,
            behaviorType: behaviorType,
            deviation: deviation,
            threshold: deviationThreshold
          });
          
          anomalies.push(anomaly);
        }
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting behavioral anomalies:', error);
      return [];
    }
  }

  async detectNetworkAnomalies(config, thresholds) {
    try {
      const anomalies = [];
      const { networkType, window } = config;
      const { connectionThreshold, bandwidthThreshold, latencyThreshold } = thresholds;
      
      // Get network data
      const networkData = await this.getNetworkData(networkType, window);
      
      if (networkData.length < 10) {
        return anomalies; // Need enough data for network analysis
      }
      
      // Analyze network patterns
      const patterns = this.analyzeNetworkPatterns(networkData);
      
      // Check for unusual connections
      if (patterns.connectionCount > connectionThreshold) {
        const anomaly = await this.createThreat({
          type: 'network_anomaly',
          detectorId: config.detectorId,
          severity: this.calculateSeverity(patterns.connectionCount, connectionThreshold),
          description: `Unusual network activity: ${patterns.connectionCount} connections`,
          networkType: networkType,
          connectionCount: patterns.connectionCount,
          threshold: connectionThreshold
        });
        
        anomalies.push(anomaly);
      }
      
      // Check for unusual bandwidth usage
      if (patterns.bandwidthUsage > bandwidthThreshold) {
        const anomaly = await this.createThreat({
          type: 'network_anomaly',
          detectorId: config.detectorId,
          severity: this.calculateSeverity(patterns.bandwidthUsage, bandwidthThreshold),
          description: `Unusual bandwidth usage: ${patterns.bandwidthUsage} MB/s`,
          networkType: networkType,
          bandwidthUsage: patterns.bandwidthUsage,
          threshold: bandwidthThreshold
        });
        
        anomalies.push(anomaly);
      }
      
      // Check for unusual latency
      if (patterns.avgLatency > latencyThreshold) {
        const anomaly = await this.createThreat({
          type: 'network_anomaly',
          detectorId: config.detectorId,
          severity: this.calculateSeverity(patterns.avgLatency, latencyThreshold),
          description: `Unusual network latency: ${patterns.avgLatency}ms`,
          networkType: networkType,
          latency: patterns.avgLatency,
          threshold: latencyThreshold
        });
        
        anomalies.push(anomaly);
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting network anomalies:', error);
      return [];
    }
  }

  async detectTemporalAnomalies(config, thresholds) {
    try {
      const anomalies = [];
      const { timeField, window } = config;
      const { frequencyThreshold, patternThreshold } = thresholds;
      
      // Get temporal data
      const temporalData = await this.getTemporalData(timeField, window);
      
      if (temporalData.length < 20) {
        return anomalies; // Need enough data for temporal analysis
      }
      
      // Analyze temporal patterns
      const patterns = this.analyzeTemporalPatterns(temporalData);
      
      // Check for unusual frequency
      if (patterns.frequency > frequencyThreshold) {
        const anomaly = await this.createThreat({
          type: 'temporal_anomaly',
          detectorId: config.detectorId,
          severity: this.calculateSeverity(patterns.frequency, frequencyThreshold),
          description: `Unusual temporal frequency: ${patterns.frequency} events per hour`,
          timeField: timeField,
          frequency: patterns.frequency,
          threshold: frequencyThreshold
        });
        
        anomalies.push(anomaly);
      }
      
      // Check for unusual patterns
      if (patterns.patternDeviation > patternThreshold) {
        const anomaly = await this.createThreat({
          type: 'temporal_anomaly',
          detectorId: config.detectorId,
          severity: this.calculateSeverity(patterns.patternDeviation, patternThreshold),
          description: `Unusual temporal pattern: deviation ${patterns.patternDeviation.toFixed(2)}`,
          timeField: timeField,
          patternDeviation: patterns.patternDeviation,
          threshold: patternThreshold
        });
        
        anomalies.push(anomaly);
      }
      
      return anomalies;
    } catch (error) {
      logger.error('Error detecting temporal anomalies:', error);
      return [];
    }
  }

  async matchesPattern(event, conditions) {
    try {
      for (const condition of conditions) {
        if (!await this.evaluateCondition(event, condition)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error matching pattern:', error);
      return false;
    }
  }

  async matchesRule(event, conditions) {
    try {
      for (const condition of conditions) {
        if (!await this.evaluateCondition(event, condition)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error matching rule:', error);
      return false;
    }
  }

  async evaluateCondition(event, condition) {
    try {
      const { type, field, operator, value } = condition;
      const eventValue = this.getFieldValue(event, field);
      
      switch (type) {
        case 'equals':
          return eventValue === value;
        case 'not_equals':
          return eventValue !== value;
        case 'greater_than':
          return eventValue > value;
        case 'less_than':
          return eventValue < value;
        case 'contains':
          return eventValue && eventValue.includes(value);
        case 'not_contains':
          return !eventValue || !eventValue.includes(value);
        case 'in':
          return value.includes(eventValue);
        case 'not_in':
          return !value.includes(eventValue);
        case 'exists':
          return eventValue !== undefined && eventValue !== null;
        case 'not_exists':
          return eventValue === undefined || eventValue === null;
        case 'regex':
          return eventValue && new RegExp(value).test(eventValue);
        case 'starts_with':
          return eventValue && eventValue.startsWith(value);
        case 'ends_with':
          return eventValue && eventValue.endsWith(value);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  async createThreat(threatData) {
    try {
      const threatId = nanoid();
      const threat = {
        id: threatId,
        ...threatData,
        timestamp: new Date(),
        status: 'active',
        is_resolved: false
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO threats (id, type, severity, description, threat_data, timestamp, status, is_resolved)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        threatId, threat.type, threat.severity, threat.description,
        JSON.stringify(threat), threat.timestamp, threat.status, threat.is_resolved
      ]);
      
      // Store in memory
      this.threats.set(threatId, threat);
      
      // Store in Redis
      await this.redis.setex(
        `threat:${threatId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(threat)
      );
      
      // Emit event
      this.emit('threatDetected', threat);
      
      logger.info(`Threat detected: ${threatId}`, {
        type: threat.type,
        severity: threat.severity,
        description: threat.description
      });
      
      return threat;
    } catch (error) {
      logger.error('Error creating threat:', error);
      throw error;
    }
  }

  async executeThreatActions(threat, actions) {
    try {
      for (const action of actions) {
        await this.executeAction(action, threat);
      }
    } catch (error) {
      logger.error('Error executing threat actions:', error);
    }
  }

  async executeAction(action, threat) {
    try {
      const { type, parameters } = action;
      
      switch (type) {
        case 'log':
          await this.logThreat(threat);
          break;
        case 'alert':
          await this.sendThreatAlert(threat, parameters);
          break;
        case 'block':
          await this.blockThreat(threat, parameters);
          break;
        case 'quarantine':
          await this.quarantineThreat(threat, parameters);
          break;
        case 'notify':
          await this.notifyThreat(threat, parameters);
          break;
        case 'escalate':
          await this.escalateThreat(threat, parameters);
          break;
        default:
          logger.warn(`Unknown threat action type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
    }
  }

  async logThreat(threat) {
    try {
      logger.info('Threat logged', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        description: threat.description
      });
    } catch (error) {
      logger.error('Error logging threat:', error);
    }
  }

  async sendThreatAlert(threat, parameters) {
    try {
      // Implementation for sending threat alerts
      logger.info('Threat alert sent', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        parameters
      });
    } catch (error) {
      logger.error('Error sending threat alert:', error);
    }
  }

  async blockThreat(threat, parameters) {
    try {
      // Implementation for blocking threats
      logger.info('Threat blocked', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        parameters
      });
    } catch (error) {
      logger.error('Error blocking threat:', error);
    }
  }

  async quarantineThreat(threat, parameters) {
    try {
      // Implementation for quarantining threats
      logger.info('Threat quarantined', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        parameters
      });
    } catch (error) {
      logger.error('Error quarantining threat:', error);
    }
  }

  async notifyThreat(threat, parameters) {
    try {
      // Implementation for notifying about threats
      logger.info('Threat notification sent', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        parameters
      });
    } catch (error) {
      logger.error('Error notifying threat:', error);
    }
  }

  async escalateThreat(threat, parameters) {
    try {
      // Implementation for escalating threats
      logger.info('Threat escalated', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        parameters
      });
    } catch (error) {
      logger.error('Error escalating threat:', error);
    }
  }

  async getRecentEvents(timeWindow) {
    try {
      const timeCondition = this.getTimeCondition(timeWindow);
      
      const result = await pool.query(`
        SELECT * FROM access_logs
        WHERE timestamp >= $1
        ORDER BY timestamp DESC
        LIMIT 1000
      `, [timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent events:', error);
      return [];
    }
  }

  async getDataForAnalysis(field, window) {
    try {
      const timeCondition = this.getTimeCondition(window);
      
      const result = await pool.query(`
        SELECT ${field}, timestamp
        FROM access_logs
        WHERE timestamp >= $1 AND ${field} IS NOT NULL
        ORDER BY timestamp ASC
      `, [timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting data for analysis:', error);
      return [];
    }
  }

  async getBehaviorData(userId, behaviorType, window) {
    try {
      const timeCondition = this.getTimeCondition(window);
      
      const result = await pool.query(`
        SELECT * FROM access_logs
        WHERE user_id = $1 AND timestamp >= $2
        ORDER BY timestamp ASC
      `, [userId, timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting behavior data:', error);
      return [];
    }
  }

  async getNetworkData(networkType, window) {
    try {
      const timeCondition = this.getTimeCondition(window);
      
      const result = await pool.query(`
        SELECT * FROM network_logs
        WHERE network_type = $1 AND timestamp >= $2
        ORDER BY timestamp ASC
      `, [networkType, timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting network data:', error);
      return [];
    }
  }

  async getTemporalData(timeField, window) {
    try {
      const timeCondition = this.getTimeCondition(window);
      
      const result = await pool.query(`
        SELECT ${timeField}, timestamp
        FROM access_logs
        WHERE timestamp >= $1
        ORDER BY timestamp ASC
      `, [timeCondition]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting temporal data:', error);
      return [];
    }
  }

  analyzeBehaviorPatterns(behaviorData) {
    try {
      const patterns = {
        loginTimes: [],
        ipAddresses: [],
        userAgents: [],
        resources: [],
        actions: []
      };
      
      for (const entry of behaviorData) {
        patterns.loginTimes.push(new Date(entry.timestamp).getHours());
        patterns.ipAddresses.push(entry.ip_address);
        patterns.userAgents.push(entry.user_agent);
        patterns.resources.push(entry.resource);
        patterns.actions.push(entry.action);
      }
      
      return patterns;
    } catch (error) {
      logger.error('Error analyzing behavior patterns:', error);
      return {};
    }
  }

  calculateBehaviorDeviations(patterns, profilePatterns) {
    try {
      const deviations = [];
      
      // Calculate login time deviation
      const avgLoginTime = patterns.loginTimes.reduce((a, b) => a + b, 0) / patterns.loginTimes.length;
      const profileAvgLoginTime = profilePatterns.avgLoginTime || 12;
      const loginTimeDeviation = Math.abs(avgLoginTime - profileAvgLoginTime) / 24;
      
      deviations.push({
        type: 'login_time',
        score: loginTimeDeviation
      });
      
      // Calculate IP address deviation
      const uniqueIPs = new Set(patterns.ipAddresses);
      const profileUniqueIPs = profilePatterns.uniqueIPs || 1;
      const ipDeviation = Math.abs(uniqueIPs.size - profileUniqueIPs) / Math.max(uniqueIPs.size, profileUniqueIPs);
      
      deviations.push({
        type: 'ip_address',
        score: ipDeviation
      });
      
      // Calculate resource deviation
      const uniqueResources = new Set(patterns.resources);
      const profileUniqueResources = profilePatterns.uniqueResources || 1;
      const resourceDeviation = Math.abs(uniqueResources.size - profileUniqueResources) / Math.max(uniqueResources.size, profileUniqueResources);
      
      deviations.push({
        type: 'resource',
        score: resourceDeviation
      });
      
      return deviations;
    } catch (error) {
      logger.error('Error calculating behavior deviations:', error);
      return [];
    }
  }

  analyzeNetworkPatterns(networkData) {
    try {
      const patterns = {
        connectionCount: networkData.length,
        bandwidthUsage: 0,
        avgLatency: 0,
        uniqueIPs: new Set(),
        uniquePorts: new Set()
      };
      
      let totalBandwidth = 0;
      let totalLatency = 0;
      
      for (const entry of networkData) {
        totalBandwidth += entry.bandwidth || 0;
        totalLatency += entry.latency || 0;
        patterns.uniqueIPs.add(entry.ip_address);
        patterns.uniquePorts.add(entry.port);
      }
      
      patterns.bandwidthUsage = totalBandwidth / networkData.length;
      patterns.avgLatency = totalLatency / networkData.length;
      
      return patterns;
    } catch (error) {
      logger.error('Error analyzing network patterns:', error);
      return {};
    }
  }

  analyzeTemporalPatterns(temporalData) {
    try {
      const patterns = {
        frequency: 0,
        patternDeviation: 0,
        hourlyDistribution: new Array(24).fill(0),
        dailyDistribution: new Array(7).fill(0)
      };
      
      // Calculate frequency (events per hour)
      const timeSpan = temporalData.length > 0 ? 
        new Date(temporalData[temporalData.length - 1].timestamp) - new Date(temporalData[0].timestamp) : 0;
      patterns.frequency = timeSpan > 0 ? (temporalData.length / (timeSpan / (1000 * 60 * 60))) : 0;
      
      // Calculate hourly distribution
      for (const entry of temporalData) {
        const hour = new Date(entry.timestamp).getHours();
        patterns.hourlyDistribution[hour]++;
      }
      
      // Calculate daily distribution
      for (const entry of temporalData) {
        const day = new Date(entry.timestamp).getDay();
        patterns.dailyDistribution[day]++;
      }
      
      // Calculate pattern deviation (simplified)
      const expectedHourly = temporalData.length / 24;
      let totalDeviation = 0;
      for (let i = 0; i < 24; i++) {
        totalDeviation += Math.abs(patterns.hourlyDistribution[i] - expectedHourly);
      }
      patterns.patternDeviation = totalDeviation / 24;
      
      return patterns;
    } catch (error) {
      logger.error('Error analyzing temporal patterns:', error);
      return {};
    }
  }

  calculateSeverity(value, threshold) {
    try {
      const ratio = value / threshold;
      
      if (ratio >= 3) return 'critical';
      if (ratio >= 2) return 'high';
      if (ratio >= 1.5) return 'medium';
      if (ratio >= 1) return 'low';
      return 'info';
    } catch (error) {
      logger.error('Error calculating severity:', error);
      return 'low';
    }
  }

  getFieldValue(event, field) {
    try {
      const fields = field.split('.');
      let value = event;
      
      for (const f of fields) {
        if (value && typeof value === 'object' && f in value) {
          value = value[f];
        } else {
          return null;
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Error getting field value:', error);
      return null;
    }
  }

  getTimeCondition(timeWindow) {
    const now = new Date();
    switch (timeWindow) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  async getThreats(severity, status, limit, userId) {
    try {
      let query = `
        SELECT * FROM threats
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (severity) {
        query += ` AND severity = $${paramCount}`;
        params.push(severity);
        paramCount++;
      }
      
      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting threats:', error);
      throw error;
    }
  }

  async getThreatStats() {
    try {
      const stats = {
        totalThreats: this.threats.size,
        activeThreats: Array.from(this.threats.values()).filter(t => t.status === 'active').length,
        resolvedThreats: Array.from(this.threats.values()).filter(t => t.is_resolved).length,
        threatsBySeverity: {},
        threatsByType: {}
      };
      
      // Count threats by severity
      for (const [threatId, threat] of this.threats.entries()) {
        if (!stats.threatsBySeverity[threat.severity]) {
          stats.threatsBySeverity[threat.severity] = 0;
        }
        stats.threatsBySeverity[threat.severity]++;
        
        if (!stats.threatsByType[threat.type]) {
          stats.threatsByType[threat.type] = 0;
        }
        stats.threatsByType[threat.type]++;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting threat stats:', error);
      throw error;
    }
  }
}

module.exports = ThreatDetector;
