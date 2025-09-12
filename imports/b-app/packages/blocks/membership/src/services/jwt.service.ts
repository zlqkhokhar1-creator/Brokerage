import jwt from 'jsonwebtoken';
import { randomBytes, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JWTConfig, SigningKey, TokenClaims, AuthenticationResult } from '../types/index.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class JWTService {
  private config: JWTConfig;
  private keys: Map<string, SigningKey> = new Map();
  private activeKeyId: string | null = null;
  private keyMetadataPath: string;

  constructor(config?: Partial<JWTConfig>, keyMetadataPath = './artifacts/runtime/keys/metadata.json') {
    this.config = {
      issuer: process.env.JWT_ISSUER || 'brokerage-platform',
      accessTokenTTL: parseInt(process.env.JWT_ACCESS_TTL || '900'), // 15 minutes
      refreshTokenTTL: parseInt(process.env.JWT_REFRESH_TTL || '604800'), // 7 days
      algorithm: 'HS256', // Start with HS256, structure for RS256 migration
      keyRotationInterval: parseInt(process.env.JWT_KEY_ROTATION || '86400'), // 24 hours
      ...config
    };

    this.keyMetadataPath = keyMetadataPath;
    this.ensureKeyDirectory();
    this.loadOrCreateKeys();
  }

  private ensureKeyDirectory(): void {
    const dir = dirname(this.keyMetadataPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private loadOrCreateKeys(): void {
    try {
      if (existsSync(this.keyMetadataPath)) {
        const metadata = JSON.parse(readFileSync(this.keyMetadataPath, 'utf-8'));
        
        // Load keys from metadata
        for (const keyData of metadata.keys) {
          const key: SigningKey = {
            ...keyData,
            createdAt: new Date(keyData.createdAt)
          };
          this.keys.set(key.id, key);
          
          if (key.isActive) {
            this.activeKeyId = key.id;
          }
        }
      }
      
      // Create initial key if none exist
      if (this.keys.size === 0) {
        this.generateNewKey();
      }
    } catch (error) {
      console.error('Failed to load JWT keys:', error);
      // Create new key as fallback
      this.generateNewKey();
    }
  }

  private generateNewKey(): string {
    const keyId = uuidv4();
    const key = this.config.algorithm === 'RS256' 
      ? this.generateRSAKeyPair() 
      : this.generateHMACKey();

    const signingKey: SigningKey = {
      id: keyId,
      algorithm: this.config.algorithm,
      key: key.privateKey || key.key,
      publicKey: key.publicKey,
      createdAt: new Date(),
      isActive: true
    };

    // Deactivate previous keys
    this.keys.forEach(k => k.isActive = false);
    
    // Add new key
    this.keys.set(keyId, signingKey);
    this.activeKeyId = keyId;
    
    this.persistKeyMetadata();
    
    console.info(`Generated new JWT signing key: ${keyId} (${this.config.algorithm})`);
    return keyId;
  }

  private generateHMACKey(): { key: string } {
    return {
      key: randomBytes(64).toString('base64')
    };
  }

  private generateRSAKeyPair(): { privateKey: string; publicKey: string } {
    // TODO: Implement RS256 key generation
    // For now, placeholder that throws
    throw new Error('RS256 key generation not yet implemented - TODO for Phase 4');
  }

  private persistKeyMetadata(): void {
    const metadata = {
      keys: Array.from(this.keys.values()).map(key => ({
        id: key.id,
        algorithm: key.algorithm,
        key: key.key,
        publicKey: key.publicKey,
        createdAt: key.createdAt.toISOString(),
        isActive: key.isActive
      })),
      lastRotation: new Date().toISOString()
    };

    try {
      writeFileSync(this.keyMetadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to persist key metadata:', error);
    }
  }

  /**
   * Issue access and refresh tokens for a user
   */
  async issueTokens(userId: string, email: string, traceId?: string): Promise<AuthenticationResult> {
    const activeKey = this.getActiveKey();
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExp = now + this.config.accessTokenTTL;

    const claims: TokenClaims = {
      sub: userId,
      email,
      iss: this.config.issuer,
      iat: now,
      exp: accessTokenExp,
      kid: activeKey.id
    };

    const accessToken = jwt.sign(claims, activeKey.key as string, {
      algorithm: activeKey.algorithm
    });

    // Generate opaque refresh token
    const refreshToken = this.generateRefreshToken();

    // TODO: Store refresh token in persistent store for validation
    console.info('Issued tokens for user', {
      userId,
      email,
      accessTokenExp: new Date(accessTokenExp * 1000).toISOString(),
      traceId
    });

    return {
      accessToken,
      refreshToken,
      userId,
      expiresIn: this.config.accessTokenTTL
    };
  }

  /**
   * Verify and decode an access token
   */
  async verifyToken(token: string): Promise<TokenClaims> {
    try {
      // Decode header to get kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded?.header?.kid) {
        throw new Error('Token missing key ID');
      }

      const key = this.keys.get(decoded.header.kid);
      if (!key) {
        throw new Error('Unknown key ID');
      }

      const verified = jwt.verify(token, key.key as string, {
        algorithms: [key.algorithm],
        issuer: this.config.issuer
      });

      return verified as TokenClaims;
    } catch (error) {
      console.error('Token verification failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid token');
    }
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key exposure
   */
  getJWKS(): object {
    const keys = Array.from(this.keys.values())
      .filter(key => key.isActive)
      .map(key => {
        if (this.config.algorithm === 'HS256') {
          // For HS256, we don't expose the actual key in JWKS
          // This is a placeholder structure for future RS256 migration
          return {
            kid: key.id,
            kty: 'oct', // Octet string for symmetric keys
            alg: 'HS256',
            use: 'sig',
            // Note: symmetric key is NOT exposed in JWKS for security
          };
        } else {
          // TODO: For RS256, expose public key
          return {
            kid: key.id,
            kty: 'RSA',
            alg: 'RS256',
            use: 'sig',
            // TODO: Add n, e parameters from public key
          };
        }
      });

    return { keys };
  }

  /**
   * Rotate signing keys
   */
  rotateKeys(): string {
    const newKeyId = this.generateNewKey();
    
    // TODO: Implement grace period for old keys
    console.info(`Key rotation completed. New active key: ${newKeyId}`);
    
    return newKeyId;
  }

  private getActiveKey(): SigningKey {
    if (!this.activeKeyId) {
      throw new Error('No active signing key available');
    }

    const key = this.keys.get(this.activeKeyId);
    if (!key) {
      throw new Error('Active key not found');
    }

    return key;
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Get configuration for audit purposes
   */
  getConfig(): JWTConfig {
    return { ...this.config };
  }

  /**
   * Get active key info (excluding sensitive data)
   */
  getActiveKeyInfo(): { id: string; algorithm: string; createdAt: Date } | null {
    const key = this.activeKeyId ? this.keys.get(this.activeKeyId) : null;
    return key ? {
      id: key.id,
      algorithm: key.algorithm,
      createdAt: key.createdAt
    } : null;
  }
}