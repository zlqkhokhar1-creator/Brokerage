const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class MicroSegmentation {
  async applySegmentationRules(userId, resource, context) {
    try {
      // Get user's security profile
      const securityProfile = await this.getUserSecurityProfile(userId);
      
      // Apply network segmentation rules
      const networkResult = await this.applyNetworkSegmentation(userId, resource, context);
      if (!networkResult.allowed) {
        return networkResult;
      }
      
      // Apply data segmentation rules
      const dataResult = await this.applyDataSegmentation(userId, resource, context);
      if (!dataResult.allowed) {
        return dataResult;
      }
      
      // Apply application segmentation rules
      const appResult = await this.applyApplicationSegmentation(userId, resource, context);
      if (!appResult.allowed) {
        return appResult;
      }
      
      return {
        allowed: true,
        restrictions: {
          network: networkResult.restrictions,
          data: dataResult.restrictions,
          application: appResult.restrictions
        }
      };
    } catch (error) {
      logger.error('Error applying segmentation rules:', error);
      return {
        allowed: false,
        reason: 'Segmentation rule application failed'
      };
    }
  }

  async getUserSecurityProfile(userId) {
    try {
      const query = `
        SELECT sp.*, u.role, u.security_level
        FROM user_security_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id = $1 AND sp.is_active = true
      `;
      
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default security profile
        return {
          userId,
          securityLevel: 'medium',
          networkSegments: ['default'],
          dataAccessLevel: 'standard',
          applicationAccess: ['basic'],
          restrictions: {}
        };
      }
      
      const profile = result.rows[0];
      return {
        userId: profile.user_id,
        securityLevel: profile.security_level,
        networkSegments: profile.network_segments || ['default'],
        dataAccessLevel: profile.data_access_level || 'standard',
        applicationAccess: profile.application_access || ['basic'],
        restrictions: profile.restrictions || {}
      };
    } catch (error) {
      logger.error('Error getting user security profile:', error);
      return {
        userId,
        securityLevel: 'medium',
        networkSegments: ['default'],
        dataAccessLevel: 'standard',
        applicationAccess: ['basic'],
        restrictions: {}
      };
    }
  }

  async applyNetworkSegmentation(userId, resource, context) {
    try {
      const securityProfile = await this.getUserSecurityProfile(userId);
      const allowedSegments = securityProfile.networkSegments;
      
      // Check if resource is in allowed network segment
      const resourceSegment = await this.getResourceNetworkSegment(resource);
      
      if (!allowedSegments.includes(resourceSegment)) {
        return {
          allowed: false,
          reason: 'Resource not in allowed network segment',
          restrictions: {
            allowedSegments,
            resourceSegment
          }
        };
      }
      
      // Check for network isolation requirements
      const isolationRequired = await this.checkNetworkIsolation(userId, resource);
      if (isolationRequired && !context.isolated) {
        return {
          allowed: false,
          reason: 'Network isolation required for this resource',
          restrictions: {
            isolationRequired: true
          }
        };
      }
      
      return {
        allowed: true,
        restrictions: {
          allowedSegments,
          resourceSegment,
          isolationRequired
        }
      };
    } catch (error) {
      logger.error('Error applying network segmentation:', error);
      return {
        allowed: false,
        reason: 'Network segmentation check failed'
      };
    }
  }

  async applyDataSegmentation(userId, resource, context) {
    try {
      const securityProfile = await this.getUserSecurityProfile(userId);
      const userDataAccessLevel = securityProfile.dataAccessLevel;
      
      // Get resource data classification
      const resourceClassification = await this.getResourceDataClassification(resource);
      
      // Check data access level compatibility
      if (!this.isDataAccessAllowed(userDataAccessLevel, resourceClassification)) {
        return {
          allowed: false,
          reason: 'Insufficient data access level for this resource',
          restrictions: {
            userDataAccessLevel,
            resourceClassification
          }
        };
      }
      
      // Check for data encryption requirements
      const encryptionRequired = await this.checkDataEncryptionRequirement(resource);
      if (encryptionRequired && !context.encrypted) {
        return {
          allowed: false,
          reason: 'Data encryption required for this resource',
          restrictions: {
            encryptionRequired: true
          }
        };
      }
      
      return {
        allowed: true,
        restrictions: {
          userDataAccessLevel,
          resourceClassification,
          encryptionRequired
        }
      };
    } catch (error) {
      logger.error('Error applying data segmentation:', error);
      return {
        allowed: false,
        reason: 'Data segmentation check failed'
      };
    }
  }

  async applyApplicationSegmentation(userId, resource, context) {
    try {
      const securityProfile = await this.getUserSecurityProfile(userId);
      const userApplicationAccess = securityProfile.applicationAccess;
      
      // Get resource application type
      const resourceApplicationType = await this.getResourceApplicationType(resource);
      
      // Check if user has access to this application type
      if (!userApplicationAccess.includes(resourceApplicationType)) {
        return {
          allowed: false,
          reason: 'User not authorized for this application type',
          restrictions: {
            userApplicationAccess,
            resourceApplicationType
          }
        };
      }
      
      // Check for application-specific restrictions
      const appRestrictions = await this.getApplicationRestrictions(resource);
      if (appRestrictions && !this.checkApplicationRestrictions(userId, appRestrictions, context)) {
        return {
          allowed: false,
          reason: 'Application-specific restrictions not met',
          restrictions: appRestrictions
        };
      }
      
      return {
        allowed: true,
        restrictions: {
          userApplicationAccess,
          resourceApplicationType,
          appRestrictions
        }
      };
    } catch (error) {
      logger.error('Error applying application segmentation:', error);
      return {
        allowed: false,
        reason: 'Application segmentation check failed'
      };
    }
  }

  async getResourceNetworkSegment(resource) {
    try {
      const query = 'SELECT network_segment FROM resources WHERE name = $1';
      const result = await database.query(query, [resource]);
      
      if (result.rows.length === 0) {
        return 'default';
      }
      
      return result.rows[0].network_segment || 'default';
    } catch (error) {
      logger.error('Error getting resource network segment:', error);
      return 'default';
    }
  }

  async getResourceDataClassification(resource) {
    try {
      const query = 'SELECT data_classification FROM resources WHERE name = $1';
      const result = await database.query(query, [resource]);
      
      if (result.rows.length === 0) {
        return 'public';
      }
      
      return result.rows[0].data_classification || 'public';
    } catch (error) {
      logger.error('Error getting resource data classification:', error);
      return 'public';
    }
  }

  async getResourceApplicationType(resource) {
    try {
      const query = 'SELECT application_type FROM resources WHERE name = $1';
      const result = await database.query(query, [resource]);
      
      if (result.rows.length === 0) {
        return 'basic';
      }
      
      return result.rows[0].application_type || 'basic';
    } catch (error) {
      logger.error('Error getting resource application type:', error);
      return 'basic';
    }
  }

  isDataAccessAllowed(userLevel, resourceLevel) {
    const accessLevels = {
      'public': 1,
      'internal': 2,
      'confidential': 3,
      'restricted': 4,
      'top_secret': 5
    };
    
    const userLevelValue = accessLevels[userLevel] || 1;
    const resourceLevelValue = accessLevels[resourceLevel] || 1;
    
    return userLevelValue >= resourceLevelValue;
  }

  async checkNetworkIsolation(userId, resource) {
    try {
      const query = `
        SELECT requires_isolation 
        FROM resources 
        WHERE name = $1 AND requires_isolation = true
      `;
      
      const result = await database.query(query, [resource]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking network isolation:', error);
      return false;
    }
  }

  async checkDataEncryptionRequirement(resource) {
    try {
      const query = `
        SELECT requires_encryption 
        FROM resources 
        WHERE name = $1 AND requires_encryption = true
      `;
      
      const result = await database.query(query, [resource]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking data encryption requirement:', error);
      return false;
    }
  }

  async getApplicationRestrictions(resource) {
    try {
      const query = 'SELECT restrictions FROM resources WHERE name = $1';
      const result = await database.query(query, [resource]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].restrictions;
    } catch (error) {
      logger.error('Error getting application restrictions:', error);
      return null;
    }
  }

  checkApplicationRestrictions(userId, restrictions, context) {
    try {
      if (!restrictions) {
        return true;
      }
      
      // Check time restrictions
      if (restrictions.timeRestrictions) {
        const currentHour = new Date().getHours();
        if (restrictions.timeRestrictions.allowedHours && 
            !restrictions.timeRestrictions.allowedHours.includes(currentHour)) {
          return false;
        }
      }
      
      // Check device restrictions
      if (restrictions.deviceRestrictions && context.deviceId) {
        if (restrictions.deviceRestrictions.allowedDevices && 
            !restrictions.deviceRestrictions.allowedDevices.includes(context.deviceId)) {
          return false;
        }
      }
      
      // Check location restrictions
      if (restrictions.locationRestrictions && context.location) {
        if (restrictions.locationRestrictions.allowedLocations && 
            !restrictions.locationRestrictions.allowedLocations.includes(context.location)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking application restrictions:', error);
      return false;
    }
  }

  async createSecurityProfile(userId, profileData) {
    try {
      const query = `
        INSERT INTO user_security_profiles 
        (user_id, security_level, network_segments, data_access_level, 
         application_access, restrictions, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          security_level = $2,
          network_segments = $3,
          data_access_level = $4,
          application_access = $5,
          restrictions = $6,
          updated_at = NOW()
      `;
      
      await database.query(query, [
        userId,
        profileData.securityLevel,
        JSON.stringify(profileData.networkSegments),
        profileData.dataAccessLevel,
        JSON.stringify(profileData.applicationAccess),
        JSON.stringify(profileData.restrictions)
      ]);
      
      return true;
    } catch (error) {
      logger.error('Error creating security profile:', error);
      return false;
    }
  }

  async updateSecurityProfile(userId, profileData) {
    try {
      const query = `
        UPDATE user_security_profiles 
        SET security_level = $2,
            network_segments = $3,
            data_access_level = $4,
            application_access = $5,
            restrictions = $6,
            updated_at = NOW()
        WHERE user_id = $1
      `;
      
      await database.query(query, [
        userId,
        profileData.securityLevel,
        JSON.stringify(profileData.networkSegments),
        profileData.dataAccessLevel,
        JSON.stringify(profileData.applicationAccess),
        JSON.stringify(profileData.restrictions)
      ]);
      
      return true;
    } catch (error) {
      logger.error('Error updating security profile:', error);
      return false;
    }
  }
}

module.exports = new MicroSegmentation();

