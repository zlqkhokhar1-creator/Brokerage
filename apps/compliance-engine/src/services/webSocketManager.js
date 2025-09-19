const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');

class WebSocketManager extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.subscriptions = new Map(); // socketId -> Set of subscription types
    this.complianceSubscriptions = new Map(); // portfolioId -> Set of socketIds
    this.userSubscriptions = new Map(); // userId -> Set of socketIds
  }

  async subscribe(socketId, type, data) {
    try {
      const { portfolioId, userId } = data;
      
      // Initialize socket subscriptions if not exists
      if (!this.subscriptions.has(socketId)) {
        this.subscriptions.set(socketId, new Set());
      }
      
      // Add subscription type
      this.subscriptions.get(socketId).add(type);
      
      // Add to specific subscription maps
      switch (type) {
        case 'compliance_status':
          if (portfolioId) {
            if (!this.complianceSubscriptions.has(portfolioId)) {
              this.complianceSubscriptions.set(portfolioId, new Set());
            }
            this.complianceSubscriptions.get(portfolioId).add(socketId);
          }
          break;
          
        case 'compliance_alerts':
          if (userId) {
            if (!this.userSubscriptions.has(userId)) {
              this.userSubscriptions.set(userId, new Set());
            }
            this.userSubscriptions.get(userId).add(socketId);
          }
          break;
          
        case 'regulatory_reports':
          if (userId) {
            if (!this.userSubscriptions.has(userId)) {
              this.userSubscriptions.set(userId, new Set());
            }
            this.userSubscriptions.get(userId).add(socketId);
          }
          break;
          
        case 'kyc_updates':
          if (userId) {
            if (!this.userSubscriptions.has(userId)) {
              this.userSubscriptions.set(userId, new Set());
            }
            this.userSubscriptions.get(userId).add(socketId);
          }
          break;
          
        case 'surveillance_alerts':
          if (userId) {
            if (!this.userSubscriptions.has(userId)) {
              this.userSubscriptions.set(userId, new Set());
            }
            this.userSubscriptions.get(userId).add(socketId);
          }
          break;
      }
      
      logger.info(`Socket ${socketId} subscribed to ${type}`, { portfolioId, userId });
    } catch (error) {
      logger.error(`Error subscribing socket ${socketId} to ${type}:`, error);
    }
  }

  async unsubscribe(socketId, type, data) {
    try {
      const { portfolioId, userId } = data;
      
      // Remove from socket subscriptions
      if (this.subscriptions.has(socketId)) {
        this.subscriptions.get(socketId).delete(type);
      }
      
      // Remove from specific subscription maps
      switch (type) {
        case 'compliance_status':
          if (portfolioId && this.complianceSubscriptions.has(portfolioId)) {
            this.complianceSubscriptions.get(portfolioId).delete(socketId);
            if (this.complianceSubscriptions.get(portfolioId).size === 0) {
              this.complianceSubscriptions.delete(portfolioId);
            }
          }
          break;
          
        case 'compliance_alerts':
        case 'regulatory_reports':
        case 'kyc_updates':
        case 'surveillance_alerts':
          if (userId && this.userSubscriptions.has(userId)) {
            this.userSubscriptions.get(userId).delete(socketId);
            if (this.userSubscriptions.get(userId).size === 0) {
              this.userSubscriptions.delete(userId);
            }
          }
          break;
      }
      
      logger.info(`Socket ${socketId} unsubscribed from ${type}`, { portfolioId, userId });
    } catch (error) {
      logger.error(`Error unsubscribing socket ${socketId} from ${type}:`, error);
    }
  }

  handleDisconnect(socketId) {
    try {
      // Remove from all subscriptions
      if (this.subscriptions.has(socketId)) {
        const subscriptionTypes = this.subscriptions.get(socketId);
        
        for (const type of subscriptionTypes) {
          switch (type) {
            case 'compliance_status':
              this.removeFromComplianceSubscriptions(socketId);
              break;
            case 'compliance_alerts':
            case 'regulatory_reports':
            case 'kyc_updates':
            case 'surveillance_alerts':
              this.removeFromUserSubscriptions(socketId);
              break;
          }
        }
        
        this.subscriptions.delete(socketId);
      }
      
      logger.info(`Socket ${socketId} disconnected and cleaned up`);
    } catch (error) {
      logger.error(`Error handling disconnect for socket ${socketId}:`, error);
    }
  }

  removeFromComplianceSubscriptions(socketId) {
    for (const [portfolioId, socketIds] of this.complianceSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.complianceSubscriptions.delete(portfolioId);
      }
    }
  }

  removeFromUserSubscriptions(socketId) {
    for (const [userId, socketIds] of this.userSubscriptions) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }
  }

  broadcastComplianceViolation(portfolioId, violationData) {
    try {
      if (this.complianceSubscriptions.has(portfolioId)) {
        const socketIds = this.complianceSubscriptions.get(portfolioId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('compliance_violation', {
              portfolioId: portfolioId,
              violation: violationData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted compliance violation for ${portfolioId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting compliance violation for ${portfolioId}:`, error);
    }
  }

  broadcastComplianceStatusUpdate(portfolioId, statusData) {
    try {
      if (this.complianceSubscriptions.has(portfolioId)) {
        const socketIds = this.complianceSubscriptions.get(portfolioId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('compliance_status_update', {
              portfolioId: portfolioId,
              status: statusData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted compliance status update for ${portfolioId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting compliance status update for ${portfolioId}:`, error);
    }
  }

  broadcastComplianceAlert(userId, alert) {
    try {
      if (this.userSubscriptions.has(userId)) {
        const socketIds = this.userSubscriptions.get(userId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('compliance_alert', {
              alert: alert,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted compliance alert for user ${userId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting compliance alert for user ${userId}:`, error);
    }
  }

  broadcastReportGenerated(userId, reportData) {
    try {
      if (this.userSubscriptions.has(userId)) {
        const socketIds = this.userSubscriptions.get(userId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('regulatory_report_generated', {
              report: reportData,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted regulatory report generated for user ${userId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting regulatory report generated for user ${userId}:`, error);
    }
  }

  broadcastKYCStatusChanged(customerId, kycData) {
    try {
      // Find user ID from customer ID (in reality would query database)
      const userId = kycData.userId;
      
      if (this.userSubscriptions.has(userId)) {
        const socketIds = this.userSubscriptions.get(userId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('kyc_status_changed', {
              customerId: customerId,
              status: kycData.status,
              score: kycData.score,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted KYC status changed for customer ${customerId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting KYC status changed for customer ${customerId}:`, error);
    }
  }

  broadcastSurveillanceAlert(userId, alert) {
    try {
      if (this.userSubscriptions.has(userId)) {
        const socketIds = this.userSubscriptions.get(userId);
        
        for (const socketId of socketIds) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('surveillance_alert', {
              alert: alert,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info(`Broadcasted surveillance alert for user ${userId} to ${socketIds.size} clients`);
      }
    } catch (error) {
      logger.error(`Error broadcasting surveillance alert for user ${userId}:`, error);
    }
  }

  broadcastPolicyUpdate(policyId, policyData) {
    try {
      // Broadcast to all connected clients
      this.io.emit('policy_updated', {
        policyId: policyId,
        policy: policyData,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted policy update: ${policyId}`);
    } catch (error) {
      logger.error(`Error broadcasting policy update ${policyId}:`, error);
    }
  }

  broadcastAuditEvent(eventData) {
    try {
      // Broadcast to all connected clients
      this.io.emit('audit_event', {
        event: eventData,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted audit event: ${eventData.eventType}`);
    } catch (error) {
      logger.error(`Error broadcasting audit event:`, error);
    }
  }

  broadcastSystemAlert(alert) {
    try {
      this.io.emit('system_alert', {
        alert: alert,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Broadcasted system alert: ${alert.message}`);
    } catch (error) {
      logger.error(`Error broadcasting system alert:`, error);
    }
  }

  getSubscriptionStats() {
    try {
      return {
        totalSockets: this.subscriptions.size,
        complianceSubscriptions: this.complianceSubscriptions.size,
        userSubscriptions: this.userSubscriptions.size,
        totalComplianceSubscribers: Array.from(this.complianceSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0),
        totalUserSubscribers: Array.from(this.userSubscriptions.values())
          .reduce((sum, socketIds) => sum + socketIds.size, 0)
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return {
        totalSockets: 0,
        complianceSubscriptions: 0,
        userSubscriptions: 0,
        totalComplianceSubscribers: 0,
        totalUserSubscribers: 0
      };
    }
  }

  async close() {
    try {
      // Clear all subscriptions
      this.subscriptions.clear();
      this.complianceSubscriptions.clear();
      this.userSubscriptions.clear();
      
      logger.info('WebSocket Manager closed successfully');
    } catch (error) {
      logger.error('Error closing WebSocket Manager:', error);
    }
  }
}

module.exports = WebSocketManager;

