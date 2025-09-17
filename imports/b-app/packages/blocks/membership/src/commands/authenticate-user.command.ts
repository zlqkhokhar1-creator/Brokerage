import { AuthenticateUserCommand, AuthenticateUserCommandSchema, AuthenticationResult } from '../types/index.js';
import { UserRepository, PasswordService } from '../types/index.js';
import { JWTService } from '../services/jwt.service.js';
import { membershipEvents } from '../events/event-emitter.js';

export class AuthenticateUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private jwtService: JWTService
  ) {}

  async execute(command: AuthenticateUserCommand, traceId?: string): Promise<AuthenticationResult> {
    // Validate command
    const validatedCommand = AuthenticateUserCommandSchema.parse(command);
    
    const startTime = Date.now();
    let authSuccess = false;
    let userId: string | undefined;

    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(validatedCommand.email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      userId = user.id;

      // Verify password
      const passwordValid = await this.passwordService.verify(
        validatedCommand.password, 
        user.passwordHash
      );

      if (!passwordValid) {
        throw new Error('Invalid credentials');
      }

      // Check if password needs rehashing (e.g., migrating from bcrypt to Argon2)
      if ('needsRehash' in this.passwordService && this.passwordService.needsRehash(user.passwordHash)) {
        // Rehash password with current algorithm
        const newHash = await this.passwordService.hash(validatedCommand.password);
        await this.userRepository.update(user.id, { passwordHash: newHash });
        
        console.info('Password rehashed during authentication', {
          userId: user.id,
          traceId
        });
      }

      // Issue tokens
      const authResult = await this.jwtService.issueTokens(user.id, user.email, traceId);
      
      authSuccess = true;

      // Emit event
      membershipEvents.emitUserAuthenticated(user.id, 'password', traceId);

      // Log success (sanitized)
      const duration = Date.now() - startTime;
      console.info('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        duration,
        traceId
      });

      return authResult;

    } catch (error) {
      // Log failure (sanitized - never log password or password hash)
      const duration = Date.now() - startTime;
      console.error('Authentication failed', {
        email: validatedCommand.email,
        userId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });

      // Always throw generic message to prevent user enumeration
      throw new Error('Invalid credentials');
    } finally {
      // TODO: Emit metrics
      // metrics.incrementAuthAttempts(authSuccess);
      // metrics.recordAuthDuration(Date.now() - startTime);
    }
  }
}