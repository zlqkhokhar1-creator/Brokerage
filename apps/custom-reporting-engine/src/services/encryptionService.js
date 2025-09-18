const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const crypto = require('crypto');

class EncryptionService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.encryptionKeys = new Map();
    this.encryptionAlgorithms = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load encryption algorithms
      await this.loadEncryptionAlgorithms();
      
      // Load encryption keys
      await this.loadEncryptionKeys();
      
      this._initialized = true;
      logger.info('EncryptionService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EncryptionService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('EncryptionService closed');
    } catch (error) {
      logger.error('Error closing EncryptionService:', error);
    }
  }

  async loadEncryptionAlgorithms() {
    try {
      this.encryptionAlgorithms = new Map([
        ['aes-256-gcm', {
          name: 'AES-256-GCM',
          description: 'AES-256 in GCM mode',
          keyLength: 32,
          ivLength: 12,
          tagLength: 16,
          secure: true
        }],
        ['aes-256-cbc', {
          name: 'AES-256-CBC',
          description: 'AES-256 in CBC mode',
          keyLength: 32,
          ivLength: 16,
          tagLength: 0,
          secure: true
        }],
        ['aes-128-gcm', {
          name: 'AES-128-GCM',
          description: 'AES-128 in GCM mode',
          keyLength: 16,
          ivLength: 12,
          tagLength: 16,
          secure: true
        }],
        ['aes-128-cbc', {
          name: 'AES-128-CBC',
          description: 'AES-128 in CBC mode',
          keyLength: 16,
          ivLength: 16,
          tagLength: 0,
          secure: true
        }],
        ['chacha20-poly1305', {
          name: 'ChaCha20-Poly1305',
          description: 'ChaCha20 stream cipher with Poly1305 authenticator',
          keyLength: 32,
          ivLength: 12,
          tagLength: 16,
          secure: true
        }]
      ]);
      
      logger.info('Encryption algorithms loaded successfully');
    } catch (error) {
      logger.error('Error loading encryption algorithms:', error);
      throw error;
    }
  }

  async loadEncryptionKeys() {
    try {
      // Load encryption keys from environment or database
      const masterKey = process.env.MASTER_ENCRYPTION_KEY;
      if (masterKey) {
        this.encryptionKeys.set('master', {
          id: 'master',
          key: masterKey,
          algorithm: 'aes-256-gcm',
          createdAt: new Date().toISOString(),
          active: true
        });
      }
      
      // Load additional keys from database
      const query = 'SELECT * FROM encryption_keys WHERE active = true';
      const result = await pool.query(query);
      
      for (const row of result.rows) {
        this.encryptionKeys.set(row.id, {
          id: row.id,
          key: row.key,
          algorithm: row.algorithm,
          createdAt: row.created_at,
          active: row.active
        });
      }
      
      logger.info('Encryption keys loaded successfully');
    } catch (error) {
      logger.error('Error loading encryption keys:', error);
      throw error;
    }
  }

  async encrypt(data, keyId = 'master', algorithm = 'aes-256-gcm') {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      const algo = this.encryptionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Encryption algorithm not supported: ${algorithm}`);
      }
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const dataBuffer = Buffer.from(dataString, 'utf8');
      
      let encrypted;
      let iv;
      let tag;
      
      switch (algorithm) {
        case 'aes-256-gcm':
        case 'aes-128-gcm':
          ({ encrypted, iv, tag } = await this.encryptGCM(dataBuffer, key.key, algorithm));
          break;
        case 'aes-256-cbc':
        case 'aes-128-cbc':
          ({ encrypted, iv } = await this.encryptCBC(dataBuffer, key.key, algorithm));
          break;
        case 'chacha20-poly1305':
          ({ encrypted, iv, tag } = await this.encryptChaCha20(dataBuffer, key.key));
          break;
        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }
      
      const result = {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        algorithm: algorithm,
        keyId: keyId,
        timestamp: Date.now()
      };
      
      if (tag) {
        result.tag = tag.toString('base64');
      }
      
      this.emit('dataEncrypted', { keyId, algorithm, dataSize: dataBuffer.length });
      
      logger.debug(`Data encrypted with ${algorithm}`, { keyId, dataSize: dataBuffer.length });
      
      return result;
    } catch (error) {
      logger.error('Error encrypting data:', error);
      throw error;
    }
  }

  async decrypt(encryptedData, keyId = 'master') {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      const algorithm = encryptedData.algorithm || key.algorithm;
      const algo = this.encryptionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Encryption algorithm not supported: ${algorithm}`);
      }
      
      const encryptedBuffer = Buffer.from(encryptedData.encrypted, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : null;
      
      let decrypted;
      
      switch (algorithm) {
        case 'aes-256-gcm':
        case 'aes-128-gcm':
          decrypted = await this.decryptGCM(encryptedBuffer, key.key, iv, tag, algorithm);
          break;
        case 'aes-256-cbc':
        case 'aes-128-cbc':
          decrypted = await this.decryptCBC(encryptedBuffer, key.key, iv, algorithm);
          break;
        case 'chacha20-poly1305':
          decrypted = await this.decryptChaCha20(encryptedBuffer, key.key, iv, tag);
          break;
        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }
      
      const decryptedString = decrypted.toString('utf8');
      
      // Try to parse as JSON, fallback to string
      let result;
      try {
        result = JSON.parse(decryptedString);
      } catch (error) {
        result = decryptedString;
      }
      
      this.emit('dataDecrypted', { keyId, algorithm, dataSize: decrypted.length });
      
      logger.debug(`Data decrypted with ${algorithm}`, { keyId, dataSize: decrypted.length });
      
      return result;
    } catch (error) {
      logger.error('Error decrypting data:', error);
      throw error;
    }
  }

  async encryptGCM(data, key, algorithm) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from(''));
      
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      return { encrypted, iv, tag };
    } catch (error) {
      logger.error('Error encrypting with GCM:', error);
      throw error;
    }
  }

  async decryptGCM(encrypted, key, iv, tag, algorithm) {
    try {
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from(''));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting with GCM:', error);
      throw error;
    }
  }

  async encryptCBC(data, key, algorithm) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return { encrypted, iv };
    } catch (error) {
      logger.error('Error encrypting with CBC:', error);
      throw error;
    }
  }

  async decryptCBC(encrypted, key, iv, algorithm) {
    try {
      const decipher = crypto.createDecipher(algorithm, key);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting with CBC:', error);
      throw error;
    }
  }

  async encryptChaCha20(data, key) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipher('chacha20-poly1305', key);
      cipher.setAAD(Buffer.from(''));
      
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      return { encrypted, iv, tag };
    } catch (error) {
      logger.error('Error encrypting with ChaCha20:', error);
      throw error;
    }
  }

  async decryptChaCha20(encrypted, key, iv, tag) {
    try {
      const decipher = crypto.createDecipher('chacha20-poly1305', key);
      decipher.setAAD(Buffer.from(''));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting with ChaCha20:', error);
      throw error;
    }
  }

  async generateKey(algorithm = 'aes-256-gcm') {
    try {
      const algo = this.encryptionAlgorithms.get(algorithm);
      if (!algo) {
        throw new Error(`Encryption algorithm not supported: ${algorithm}`);
      }
      
      const key = crypto.randomBytes(algo.keyLength);
      const keyId = nanoid();
      
      // Store key
      await this.storeEncryptionKey(keyId, key.toString('base64'), algorithm);
      
      logger.info(`Encryption key generated: ${keyId}`, { algorithm });
      
      return { keyId, key: key.toString('base64'), algorithm };
    } catch (error) {
      logger.error('Error generating encryption key:', error);
      throw error;
    }
  }

  async storeEncryptionKey(keyId, key, algorithm) {
    try {
      const query = `
        INSERT INTO encryption_keys (id, key, algorithm, created_at, active)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await pool.query(query, [
        keyId,
        key,
        algorithm,
        new Date().toISOString(),
        true
      ]);
      
      // Add to in-memory cache
      this.encryptionKeys.set(keyId, {
        id: keyId,
        key: key,
        algorithm: algorithm,
        createdAt: new Date().toISOString(),
        active: true
      });
    } catch (error) {
      logger.error('Error storing encryption key:', error);
      throw error;
    }
  }

  async rotateKey(keyId, newAlgorithm = null) {
    try {
      const oldKey = this.encryptionKeys.get(keyId);
      if (!oldKey) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      const algorithm = newAlgorithm || oldKey.algorithm;
      const { keyId: newKeyId, key: newKey } = await this.generateKey(algorithm);
      
      // Mark old key as inactive
      await this.deactivateKey(keyId);
      
      logger.info(`Encryption key rotated: ${keyId} -> ${newKeyId}`, { algorithm });
      
      return { oldKeyId: keyId, newKeyId, algorithm };
    } catch (error) {
      logger.error('Error rotating encryption key:', error);
      throw error;
    }
  }

  async deactivateKey(keyId) {
    try {
      const query = 'UPDATE encryption_keys SET active = false WHERE id = $1';
      await pool.query(query, [keyId]);
      
      // Remove from in-memory cache
      this.encryptionKeys.delete(keyId);
      
      logger.info(`Encryption key deactivated: ${keyId}`);
    } catch (error) {
      logger.error('Error deactivating encryption key:', error);
      throw error;
    }
  }

  async getEncryptionKeys() {
    try {
      return Array.from(this.encryptionKeys.values()).map(key => ({
        id: key.id,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        active: key.active
      }));
    } catch (error) {
      logger.error('Error getting encryption keys:', error);
      throw error;
    }
  }

  async getEncryptionAlgorithms() {
    try {
      return Array.from(this.encryptionAlgorithms.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting encryption algorithms:', error);
      throw error;
    }
  }

  async hashData(data, algorithm = 'sha256') {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const hash = crypto.createHash(algorithm).update(dataString).digest('hex');
      
      return hash;
    } catch (error) {
      logger.error('Error hashing data:', error);
      throw error;
    }
  }

  async verifyHash(data, hash, algorithm = 'sha256') {
    try {
      const expectedHash = await this.hashData(data, algorithm);
      return expectedHash === hash;
    } catch (error) {
      logger.error('Error verifying hash:', error);
      throw error;
    }
  }

  async generateHMAC(data, key, algorithm = 'sha256') {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const hmac = crypto.createHmac(algorithm, key).update(dataString).digest('hex');
      
      return hmac;
    } catch (error) {
      logger.error('Error generating HMAC:', error);
      throw error;
    }
  }

  async verifyHMAC(data, hmac, key, algorithm = 'sha256') {
    try {
      const expectedHMAC = await this.generateHMAC(data, key, algorithm);
      return expectedHMAC === hmac;
    } catch (error) {
      logger.error('Error verifying HMAC:', error);
      throw error;
    }
  }

  async generateRandomBytes(length = 32) {
    try {
      return crypto.randomBytes(length);
    } catch (error) {
      logger.error('Error generating random bytes:', error);
      throw error;
    }
  }

  async generateRandomString(length = 32, encoding = 'hex') {
    try {
      const bytes = await this.generateRandomBytes(length);
      return bytes.toString(encoding);
    } catch (error) {
      logger.error('Error generating random string:', error);
      throw error;
    }
  }

  async getEncryptionStats() {
    try {
      const query = `
        SELECT 
          algorithm,
          COUNT(*) as key_count,
          COUNT(CASE WHEN active = true THEN 1 END) as active_keys
        FROM encryption_keys 
        GROUP BY algorithm
        ORDER BY key_count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting encryption stats:', error);
      throw error;
    }
  }
}

module.exports = EncryptionService;
