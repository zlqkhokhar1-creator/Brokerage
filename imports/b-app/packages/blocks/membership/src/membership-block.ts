import { PasswordServiceImpl } from './services/password.service.js';
import { JWTService } from './services/jwt.service.js';
import { InMemoryUserRepository } from './repositories/user.repository.js';
import { RegisterUserCommandHandler } from './commands/register-user.command.js';
import { AuthenticateUserCommandHandler } from './commands/authenticate-user.command.js';
import { GetProfileCommandHandler } from './commands/get-profile.command.js';
import { UpdateProfileCommandHandler } from './commands/update-profile.command.js';
import { ValidateTokenCommandHandler } from './commands/validate-token.command.js';
import { membershipEvents } from './events/event-emitter.js';
import { UserRepository, PasswordService } from './types/index.js';

export interface MembershipBlockConfig {
  password?: {
    useArgon2?: boolean;
    argon2?: {
      timeCost?: number;
      memoryCost?: number;
      parallelism?: number;
    };
    bcrypt?: {
      rounds?: number;
    };
  };
  jwt?: {
    issuer?: string;
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
    algorithm?: 'HS256' | 'RS256';
    keyRotationInterval?: number;
  };
  keyMetadataPath?: string;
}

/**
 * Membership block - handles authentication, user profiles, and JWT management
 */
export class MembershipBlock {
  public readonly userRepository: UserRepository;
  public readonly passwordService: PasswordService;
  public readonly jwtService: JWTService;
  
  // Command handlers
  public readonly registerUser: RegisterUserCommandHandler;
  public readonly authenticateUser: AuthenticateUserCommandHandler;
  public readonly getProfile: GetProfileCommandHandler;
  public readonly updateProfile: UpdateProfileCommandHandler;
  public readonly validateToken: ValidateTokenCommandHandler;

  constructor(config?: MembershipBlockConfig) {
    // Initialize services
    this.userRepository = new InMemoryUserRepository();
    this.passwordService = new PasswordServiceImpl(config?.password);
    this.jwtService = new JWTService(config?.jwt, config?.keyMetadataPath);

    // Initialize command handlers
    this.registerUser = new RegisterUserCommandHandler(
      this.userRepository,
      this.passwordService
    );

    this.authenticateUser = new AuthenticateUserCommandHandler(
      this.userRepository,
      this.passwordService,
      this.jwtService
    );

    this.getProfile = new GetProfileCommandHandler(this.userRepository);
    
    this.updateProfile = new UpdateProfileCommandHandler(this.userRepository);
    
    this.validateToken = new ValidateTokenCommandHandler(this.jwtService);

    console.info('Membership block initialized', {
      passwordService: config?.password?.useArgon2 ? 'Argon2id' : 'bcrypt',
      jwtAlgorithm: config?.jwt?.algorithm || 'HS256',
      keyRotationInterval: config?.jwt?.keyRotationInterval || 86400
    });
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key exposure
   */
  getJWKS(): object {
    return this.jwtService.getJWKS();
  }

  /**
   * Rotate JWT signing keys
   */
  rotateKeys(): string {
    return this.jwtService.rotateKeys();
  }

  /**
   * Get membership block statistics
   */
  getStats() {
    const userStats = 'getStats' in this.userRepository 
      ? this.userRepository.getStats() 
      : { userCount: 0, memoryUsage: 0 };

    const eventStats = membershipEvents.getStats();
    const activeKey = this.jwtService.getActiveKeyInfo();

    return {
      users: userStats,
      events: eventStats,
      jwt: {
        activeKey: activeKey ? {
          id: activeKey.id,
          algorithm: activeKey.algorithm,
          age: Math.floor((Date.now() - activeKey.createdAt.getTime()) / 1000)
        } : null,
        config: this.jwtService.getConfig()
      },
      password: {
        config: this.passwordService.getConfig?.() || {}
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.info('Shutting down membership block...');
    
    // Clear event listeners
    membershipEvents.removeAllListeners();
    
    // TODO: Close database connections, persist state, etc.
    
    console.info('Membership block shut down complete');
  }
}

// Default instance for convenience
export const membershipBlock = new MembershipBlock();