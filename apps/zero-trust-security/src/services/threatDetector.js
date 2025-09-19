const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class ThreatDetector {
  async analyzeActivity(userId, activity, context) {
    try {
      const threats = [];
      
      // Check for brute force attacks
      const bruteForceThreat = await this.detectBruteForce(userId, activity);
      if (bruteForceThreat) {
        threats.push(bruteForceThreat);
      }
      
      // Check for unusual access patterns
      const unusualAccessThreat = await this.detectUnusualAccess(userId, activity, context);
      if (unusualAccessThreat) {
        threats.push(unusualAccessThreat);
      }
      
      // Check for data exfiltration attempts
      const dataExfiltrationThreat = await this.detectDataExfiltration(userId, activity);
      if (dataExfiltrationThreat) {
        threats.push(dataExfiltrationThreat);
      }
      
      // Check for privilege escalation attempts
      const privilegeEscalationThreat = await this.detectPrivilegeEscalation(userId, activity);
      if (privilegeEscalationThreat) {
        threats.push(privilegeEscalationThreat);
      }
      
      // Check for suspicious network activity
      const networkThreat = await this.detectSuspiciousNetworkActivity(userId, activity, context);
      if (networkThreat) {
        threats.push(networkThreat);
      }
      
      // Determine overall threat level
      const threatLevel = this.calculateThreatLevel(threats);
      
      return {
        threatDetected: threats.length > 0,
        threatType: threats.length > 0 ? threats[0].type : null,
        severity: threatLevel,
        threats: threats,
        recommendations: this.generateRecommendations(threats)
      };
    } catch (error) {
      logger.error('Error analyzing activity:', error);
      return {
        threatDetected: false,
        threatType: null,
        severity: 'low',
        threats: [],
        recommendations: []
      };
    }
  }

  async detectBruteForce(userId, activity) {
    try {
      const key = `brute_force_attempts:${userId}`;
      const attempts = await redis.get(key) || 0;
      
      if (attempts >= 5) {
        return {
          type: 'brute_force',
          severity: 'high',
          description: 'Multiple failed login attempts detected',
          confidence: 0.9
        };
      }
      
      // Increment attempt counter
      await redis.set(key, parseInt(attempts) + 1, 900); // 15 minutes
      
      return null;
    } catch (error) {
      logger.error('Error detecting brute force:', error);
      return null;
    }
  }

  async detectUnusualAccess(userId, activity, context) {
    try {
      // Check for unusual time access
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        const query = 'SELECT COUNT(*) FROM user_activities WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'7 days\' AND EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 22';
        const result = await database.query(query, [userId]);
        const normalHourActivities = parseInt(result.rows[0].count);
        
        if (normalHourActivities > 0) {
          return {
            type: 'unusual_time_access',
            severity: 'medium',
            description: 'Access during unusual hours detected',
            confidence: 0.7
          };
        }
      }
      
      // Check for unusual location access
      if (context.location) {
        const query = 'SELECT COUNT(*) FROM user_activities WHERE user_id = $1 AND location = $2 AND created_at > NOW() - INTERVAL \'30 days\'';
        const result = await database.query(query, [userId, context.location]);
        const locationActivities = parseInt(result.rows[0].count);
        
        if (locationActivities === 0) {
          return {
            type: 'unusual_location_access',
            severity: 'high',
            description: 'Access from new location detected',
            confidence: 0.8
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting unusual access:', error);
      return null;
    }
  }

  async detectDataExfiltration(userId, activity) {
    try {
      // Check for large data downloads
      if (activity.type === 'data_download' && activity.size > 1000000) { // 1MB
        const query = 'SELECT SUM(size) FROM user_activities WHERE user_id = $1 AND type = \'data_download\' AND created_at > NOW() - INTERVAL \'1 hour\'';
        const result = await database.query(query, [userId]);
        const totalDownloaded = parseInt(result.rows[0].sum) || 0;
        
        if (totalDownloaded > 10000000) { // 10MB in 1 hour
          return {
            type: 'data_exfiltration',
            severity: 'high',
            description: 'Large data download detected',
            confidence: 0.9
          };
        }
      }
      
      // Check for bulk data access
      if (activity.type === 'data_query' && activity.recordCount > 10000) {
        return {
          type: 'bulk_data_access',
          severity: 'medium',
          description: 'Bulk data access detected',
          confidence: 0.6
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting data exfiltration:', error);
      return null;
    }
  }

  async detectPrivilegeEscalation(userId, activity) {
    try {
      // Check for privilege escalation attempts
      if (activity.type === 'permission_request' && activity.requestedPermissions) {
        const query = 'SELECT permissions FROM users WHERE id = $1';
        const result = await database.query(query, [userId]);
        
        if (result.rows.length > 0) {
          const currentPermissions = result.rows[0].permissions || [];
          const requestedPermissions = activity.requestedPermissions;
          
          const newPermissions = requestedPermissions.filter(perm => !currentPermissions.includes(perm));
          
          if (newPermissions.length > 0) {
            return {
              type: 'privilege_escalation',
              severity: 'high',
              description: 'Privilege escalation attempt detected',
              confidence: 0.8
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error detecting privilege escalation:', error);
      return null;
    }
  }

  async detectSuspiciousNetworkActivity(userId, activity, context) {
    try {
      // Check for suspicious IP addresses
      if (context.ipAddress) {
        const query = 'SELECT COUNT(*) FROM blocked_ips WHERE ip_address = $1';
        const result = await database.query(query, [context.ipAddress]);
        const isBlocked = parseInt(result.rows[0].count) > 0;
        
        if (isBlocked) {
          return {
            type: 'blocked_ip_access',
            severity: 'high',
            description: 'Access from blocked IP address',
            confidence: 1.0
          };
        }
      }
      
      // Check for rapid API calls
      const key = `api_calls:${userId}`;
      const apiCalls = await redis.get(key) || 0;
      
      if (apiCalls > 100) { // More than 100 calls in the time window
        return {
          type: 'rapid_api_calls',
          severity: 'medium',
          description: 'Rapid API calls detected',
          confidence: 0.7
        };
      }
      
      // Increment API call counter
      await redis.set(key, parseInt(apiCalls) + 1, 60); // 1 minute
      
      return null;
    } catch (error) {
      logger.error('Error detecting suspicious network activity:', error);
      return null;
    }
  }

  async checkSuspiciousActivity(userId, deviceId, location) {
    try {
      // Check for multiple concurrent sessions
      const query = 'SELECT COUNT(*) FROM user_sessions WHERE user_id = $1 AND is_active = true';
      const result = await database.query(query, [userId]);
      const activeSessions = parseInt(result.rows[0].count);
      
      if (activeSessions > 3) {
        return true;
      }
      
      // Check for device anomalies
      const deviceQuery = 'SELECT * FROM user_devices WHERE user_id = $1 AND device_id = $2';
      const deviceResult = await database.query(deviceQuery, [userId, deviceId]);
      
      if (deviceResult.rows.length === 0) {
        // New device - check if user has too many devices
        const deviceCountQuery = 'SELECT COUNT(*) FROM user_devices WHERE user_id = $1';
        const deviceCountResult = await database.query(deviceCountQuery, [userId]);
        const deviceCount = parseInt(deviceCountResult.rows[0].count);
        
        if (deviceCount > 5) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking suspicious activity:', error);
      return false;
    }
  }

  calculateThreatLevel(threats) {
    if (threats.length === 0) {
      return 'low';
    }
    
    const highSeverityThreats = threats.filter(t => t.severity === 'high');
    const mediumSeverityThreats = threats.filter(t => t.severity === 'medium');
    
    if (highSeverityThreats.length > 0) {
      return 'high';
    } else if (mediumSeverityThreats.length > 2) {
      return 'high';
    } else if (mediumSeverityThreats.length > 0) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  generateRecommendations(threats) {
    const recommendations = [];
    
    threats.forEach(threat => {
      switch (threat.type) {
        case 'brute_force':
          recommendations.push('Implement account lockout after failed attempts');
          recommendations.push('Enable two-factor authentication');
          break;
        case 'unusual_time_access':
          recommendations.push('Review access patterns and implement time-based restrictions');
          break;
        case 'unusual_location_access':
          recommendations.push('Verify user identity and location');
          recommendations.push('Send notification to user about new location access');
          break;
        case 'data_exfiltration':
          recommendations.push('Implement data loss prevention measures');
          recommendations.push('Review user permissions and access controls');
          break;
        case 'privilege_escalation':
          recommendations.push('Review and audit user permissions');
          recommendations.push('Implement principle of least privilege');
          break;
        case 'blocked_ip_access':
          recommendations.push('Block IP address and investigate source');
          break;
        case 'rapid_api_calls':
          recommendations.push('Implement rate limiting');
          recommendations.push('Review API usage patterns');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
}

module.exports = new ThreatDetector();