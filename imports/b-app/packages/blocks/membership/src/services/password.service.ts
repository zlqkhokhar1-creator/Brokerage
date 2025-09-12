import { PasswordService } from '../types/index.js';

let argon2: any = null;
let bcrypt: any = null;

// Try to load Argon2, fallback to bcrypt
try {
  argon2 = await import('argon2');
} catch {
  try {
    bcrypt = await import('bcryptjs');
  } catch {
    throw new Error('Neither argon2 nor bcryptjs is available');
  }
}

export interface PasswordConfig {
  useArgon2: boolean;
  argon2: {
    timeCost: number;
    memoryCost: number;
    parallelism: number;
    type: number; // argon2id = 2
  };
  bcrypt: {
    rounds: number;
  };
}

export class PasswordServiceImpl implements PasswordService {
  private config: PasswordConfig;

  constructor(config?: Partial<PasswordConfig>) {
    this.config = {
      useArgon2: !!argon2,
      argon2: {
        timeCost: 3,      // iterations
        memoryCost: 65536, // 64MB
        parallelism: 4,    // threads
        type: 2          // argon2id
      },
      bcrypt: {
        rounds: 12
      },
      ...config
    };

    // Log which password hashing method is being used
    console.info(`Password service initialized with ${this.config.useArgon2 ? 'Argon2id' : 'bcrypt'}`);
  }

  async hash(password: string): Promise<string> {
    if (this.config.useArgon2 && argon2) {
      return argon2.hash(password, {
        timeCost: this.config.argon2.timeCost,
        memoryCost: this.config.argon2.memoryCost,
        parallelism: this.config.argon2.parallelism,
        type: this.config.argon2.type
      });
    } else if (bcrypt) {
      return bcrypt.hash(password, this.config.bcrypt.rounds);
    } else {
      throw new Error('No password hashing library available');
    }
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      // Try Argon2 first if available and hash looks like Argon2
      if (this.config.useArgon2 && argon2 && hash.startsWith('$argon2')) {
        return argon2.verify(hash, password);
      }
      
      // Fallback to bcrypt for bcrypt hashes or when Argon2 not available
      if (bcrypt) {
        return bcrypt.compare(password, hash);
      }
      
      throw new Error('No password verification library available');
    } catch (error) {
      console.error('Password verification failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Check if a hash needs rehashing (e.g., when migrating from bcrypt to Argon2)
   */
  needsRehash(hash: string): boolean {
    if (this.config.useArgon2 && argon2) {
      // If we're using Argon2 but hash is bcrypt, it needs rehash
      return !hash.startsWith('$argon2');
    }
    return false;
  }

  /**
   * Get current hashing configuration for audit purposes
   */
  getConfig(): PasswordConfig {
    return { ...this.config };
  }
}