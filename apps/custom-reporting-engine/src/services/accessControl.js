const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class AccessControl extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.permissions = new Map();
    this.roles = new Map();
    this.resources = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load permissions, roles, and resources
      await this.loadPermissions();
      await this.loadRoles();
      await this.loadResources();
      
      this._initialized = true;
      logger.info('AccessControl initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AccessControl:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('AccessControl closed');
    } catch (error) {
      logger.error('Error closing AccessControl:', error);
    }
  }

  async loadPermissions() {
    try {
      this.permissions = new Map([
        ['reports:read', {
          name: 'Read Reports',
          description: 'View and access reports',
          resource: 'reports',
          action: 'read'
        }],
        ['reports:write', {
          name: 'Create Reports',
          description: 'Create and generate reports',
          resource: 'reports',
          action: 'write'
        }],
        ['reports:delete', {
          name: 'Delete Reports',
          description: 'Delete reports',
          resource: 'reports',
          action: 'delete'
        }],
        ['reports:share', {
          name: 'Share Reports',
          description: 'Share reports with other users',
          resource: 'reports',
          action: 'share'
        }],
        ['dashboards:read', {
          name: 'Read Dashboards',
          description: 'View and access dashboards',
          resource: 'dashboards',
          action: 'read'
        }],
        ['dashboards:write', {
          name: 'Create Dashboards',
          description: 'Create and modify dashboards',
          resource: 'dashboards',
          action: 'write'
        }],
        ['dashboards:delete', {
          name: 'Delete Dashboards',
          description: 'Delete dashboards',
          resource: 'dashboards',
          action: 'delete'
        }],
        ['dashboards:share', {
          name: 'Share Dashboards',
          description: 'Share dashboards with other users',
          resource: 'dashboards',
          action: 'share'
        }],
        ['exports:read', {
          name: 'Read Exports',
          description: 'View and access exports',
          resource: 'exports',
          action: 'read'
        }],
        ['exports:write', {
          name: 'Create Exports',
          description: 'Create and generate exports',
          resource: 'exports',
          action: 'write'
        }],
        ['exports:delete', {
          name: 'Delete Exports',
          description: 'Delete exports',
          resource: 'exports',
          action: 'delete'
        }],
        ['templates:read', {
          name: 'Read Templates',
          description: 'View and access templates',
          resource: 'templates',
          action: 'read'
        }],
        ['templates:write', {
          name: 'Create Templates',
          description: 'Create and modify templates',
          resource: 'templates',
          action: 'write'
        }],
        ['templates:delete', {
          name: 'Delete Templates',
          description: 'Delete templates',
          resource: 'templates',
          action: 'delete'
        }],
        ['schedules:read', {
          name: 'Read Schedules',
          description: 'View and access schedules',
          resource: 'schedules',
          action: 'read'
        }],
        ['schedules:write', {
          name: 'Create Schedules',
          description: 'Create and modify schedules',
          resource: 'schedules',
          action: 'write'
        }],
        ['schedules:delete', {
          name: 'Delete Schedules',
          description: 'Delete schedules',
          resource: 'schedules',
          action: 'delete'
        }],
        ['admin:all', {
          name: 'Admin All',
          description: 'Full administrative access',
          resource: 'admin',
          action: 'all'
        }]
      ]);
      
      logger.info('Permissions loaded successfully');
    } catch (error) {
      logger.error('Error loading permissions:', error);
      throw error;
    }
  }

  async loadRoles() {
    try {
      this.roles = new Map([
        ['admin', {
          name: 'Administrator',
          description: 'Full system access',
          permissions: [
            'reports:read', 'reports:write', 'reports:delete', 'reports:share',
            'dashboards:read', 'dashboards:write', 'dashboards:delete', 'dashboards:share',
            'exports:read', 'exports:write', 'exports:delete',
            'templates:read', 'templates:write', 'templates:delete',
            'schedules:read', 'schedules:write', 'schedules:delete',
            'admin:all'
          ],
          level: 100
        }],
        ['manager', {
          name: 'Manager',
          description: 'Management level access',
          permissions: [
            'reports:read', 'reports:write', 'reports:share',
            'dashboards:read', 'dashboards:write', 'dashboards:share',
            'exports:read', 'exports:write',
            'templates:read', 'templates:write',
            'schedules:read', 'schedules:write'
          ],
          level: 80
        }],
        ['analyst', {
          name: 'Analyst',
          description: 'Analysis and reporting access',
          permissions: [
            'reports:read', 'reports:write',
            'dashboards:read', 'dashboards:write',
            'exports:read', 'exports:write',
            'templates:read',
            'schedules:read'
          ],
          level: 60
        }],
        ['viewer', {
          name: 'Viewer',
          description: 'Read-only access',
          permissions: [
            'reports:read',
            'dashboards:read',
            'exports:read',
            'templates:read',
            'schedules:read'
          ],
          level: 40
        }],
        ['guest', {
          name: 'Guest',
          description: 'Limited access',
          permissions: [
            'reports:read',
            'dashboards:read'
          ],
          level: 20
        }]
      ]);
      
      logger.info('Roles loaded successfully');
    } catch (error) {
      logger.error('Error loading roles:', error);
      throw error;
    }
  }

  async loadResources() {
    try {
      this.resources = new Map([
        ['reports', {
          name: 'Reports',
          description: 'Report generation and management',
          actions: ['read', 'write', 'delete', 'share']
        }],
        ['dashboards', {
          name: 'Dashboards',
          description: 'Dashboard creation and management',
          actions: ['read', 'write', 'delete', 'share']
        }],
        ['exports', {
          name: 'Exports',
          description: 'Data export functionality',
          actions: ['read', 'write', 'delete']
        }],
        ['templates', {
          name: 'Templates',
          description: 'Report and dashboard templates',
          actions: ['read', 'write', 'delete']
        }],
        ['schedules', {
          name: 'Schedules',
          description: 'Report and export scheduling',
          actions: ['read', 'write', 'delete']
        }],
        ['admin', {
          name: 'Administration',
          description: 'System administration',
          actions: ['all']
        }]
      ]);
      
      logger.info('Resources loaded successfully');
    } catch (error) {
      logger.error('Error loading resources:', error);
      throw error;
    }
  }

  async checkPermission(userId, permission, resourceId = null) {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(userId);
      
      // Check if user has permission through any role
      for (const role of userRoles) {
        if (role.permissions.includes(permission)) {
          // Check resource-specific access if resourceId provided
          if (resourceId) {
            const hasResourceAccess = await this.checkResourceAccess(userId, permission, resourceId);
            if (hasResourceAccess) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking permission:', error);
      throw error;
    }
  }

  async checkResourceAccess(userId, permission, resourceId) {
    try {
      // Check if user has direct access to the resource
      const query = `
        SELECT * FROM resource_access 
        WHERE user_id = $1 AND resource_id = $2 AND permission = $3
      `;
      
      const result = await pool.query(query, [userId, resourceId, permission]);
      
      if (result.rows.length > 0) {
        return true;
      }
      
      // Check if user has access through resource ownership
      const ownershipQuery = `
        SELECT * FROM resources 
        WHERE id = $1 AND owner_id = $2
      `;
      
      const ownershipResult = await pool.query(ownershipQuery, [resourceId, userId]);
      
      if (ownershipResult.rows.length > 0) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking resource access:', error);
      throw error;
    }
  }

  async getUserRoles(userId) {
    try {
      const query = `
        SELECT r.* FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        permissions: row.permissions,
        level: row.level
      }));
    } catch (error) {
      logger.error('Error getting user roles:', error);
      throw error;
    }
  }

  async assignRole(userId, roleId) {
    try {
      const query = `
        INSERT INTO user_roles (user_id, role_id, assigned_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `;
      
      await pool.query(query, [userId, roleId, new Date().toISOString()]);
      
      logger.info(`Role assigned: ${roleId} to user ${userId}`);
    } catch (error) {
      logger.error('Error assigning role:', error);
      throw error;
    }
  }

  async removeRole(userId, roleId) {
    try {
      const query = `
        DELETE FROM user_roles 
        WHERE user_id = $1 AND role_id = $2
      `;
      
      await pool.query(query, [userId, roleId]);
      
      logger.info(`Role removed: ${roleId} from user ${userId}`);
    } catch (error) {
      logger.error('Error removing role:', error);
      throw error;
    }
  }

  async grantResourceAccess(userId, resourceId, permission) {
    try {
      const query = `
        INSERT INTO resource_access (user_id, resource_id, permission, granted_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, resource_id, permission) DO NOTHING
      `;
      
      await pool.query(query, [userId, resourceId, permission, new Date().toISOString()]);
      
      logger.info(`Resource access granted: ${permission} on ${resourceId} to user ${userId}`);
    } catch (error) {
      logger.error('Error granting resource access:', error);
      throw error;
    }
  }

  async revokeResourceAccess(userId, resourceId, permission) {
    try {
      const query = `
        DELETE FROM resource_access 
        WHERE user_id = $1 AND resource_id = $2 AND permission = $3
      `;
      
      await pool.query(query, [userId, resourceId, permission]);
      
      logger.info(`Resource access revoked: ${permission} on ${resourceId} from user ${userId}`);
    } catch (error) {
      logger.error('Error revoking resource access:', error);
      throw error;
    }
  }

  async createResource(resourceData) {
    try {
      const resourceId = nanoid();
      const query = `
        INSERT INTO resources (id, name, type, owner_id, data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(query, [
        resourceId,
        resourceData.name,
        resourceData.type,
        resourceData.ownerId,
        JSON.stringify(resourceData.data),
        new Date().toISOString()
      ]);
      
      logger.info(`Resource created: ${resourceId}`);
      return resourceId;
    } catch (error) {
      logger.error('Error creating resource:', error);
      throw error;
    }
  }

  async updateResource(resourceId, resourceData) {
    try {
      const query = `
        UPDATE resources 
        SET name = $1, data = $2, updated_at = $3
        WHERE id = $4
      `;
      
      await pool.query(query, [
        resourceData.name,
        JSON.stringify(resourceData.data),
        new Date().toISOString(),
        resourceId
      ]);
      
      logger.info(`Resource updated: ${resourceId}`);
    } catch (error) {
      logger.error('Error updating resource:', error);
      throw error;
    }
  }

  async deleteResource(resourceId) {
    try {
      const query = 'DELETE FROM resources WHERE id = $1';
      await pool.query(query, [resourceId]);
      
      logger.info(`Resource deleted: ${resourceId}`);
    } catch (error) {
      logger.error('Error deleting resource:', error);
      throw error;
    }
  }

  async getResource(resourceId) {
    try {
      const query = 'SELECT * FROM resources WHERE id = $1';
      const result = await pool.query(query, [resourceId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        ownerId: row.owner_id,
        data: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error getting resource:', error);
      throw error;
    }
  }

  async getUserResources(userId, resourceType = null) {
    try {
      let query = `
        SELECT r.* FROM resources r
        WHERE r.owner_id = $1
      `;
      let params = [userId];
      
      if (resourceType) {
        query += ' AND r.type = $2';
        params.push(resourceType);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        ownerId: row.owner_id,
        data: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error getting user resources:', error);
      throw error;
    }
  }

  async getResourceAccess(resourceId) {
    try {
      const query = `
        SELECT ra.*, u.email as user_email
        FROM resource_access ra
        JOIN users u ON ra.user_id = u.id
        WHERE ra.resource_id = $1
      `;
      
      const result = await pool.query(query, [resourceId]);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        userEmail: row.user_email,
        resourceId: row.resource_id,
        permission: row.permission,
        grantedAt: row.granted_at
      }));
    } catch (error) {
      logger.error('Error getting resource access:', error);
      throw error;
    }
  }

  async getPermissions() {
    try {
      return Array.from(this.permissions.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting permissions:', error);
      throw error;
    }
  }

  async getRoles() {
    try {
      return Array.from(this.roles.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting roles:', error);
      throw error;
    }
  }

  async getResources() {
    try {
      return Array.from(this.resources.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting resources:', error);
      throw error;
    }
  }

  async getAccessStats() {
    try {
      const query = `
        SELECT 
          r.name as role_name,
          COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        GROUP BY r.id, r.name
        ORDER BY user_count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting access stats:', error);
      throw error;
    }
  }
}

module.exports = AccessControl;
