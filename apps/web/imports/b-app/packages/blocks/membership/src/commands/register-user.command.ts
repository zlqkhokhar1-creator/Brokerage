import { RegisterUserCommand, RegisterUserCommandSchema, User } from '../types/index.js';
import { UserRepository } from '../types/index.js';
import { PasswordService } from '../types/index.js';
import { membershipEvents } from '../events/event-emitter.js';

export interface RegisterUserResult {
  userId: string;
  email: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
}

export class RegisterUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService
  ) {}

  async execute(command: RegisterUserCommand, traceId?: string): Promise<RegisterUserResult> {
    // Validate command
    const validatedCommand = RegisterUserCommandSchema.parse(command);
    
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(validatedCommand.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await this.passwordService.hash(validatedCommand.password);

      // Create user
      const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        email: validatedCommand.email,
        passwordHash,
        firstName: validatedCommand.firstName,
        lastName: validatedCommand.lastName,
        phone: validatedCommand.phone,
        dateOfBirth: validatedCommand.dateOfBirth,
        nationality: validatedCommand.nationality,
        address: validatedCommand.address,
        riskProfile: validatedCommand.riskProfile || 'moderate',
        investmentGoals: validatedCommand.investmentGoals || [],
        kycStatus: 'pending',
        version: 1
      };

      const user = await this.userRepository.create(userData);

      // Emit event
      membershipEvents.emitUserRegistered(user.id, user.email, traceId);

      // Log success (sanitized)
      console.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        hasFirstName: !!user.firstName,
        hasLastName: !!user.lastName,
        kycStatus: user.kycStatus,
        traceId
      });

      return {
        userId: user.id,
        email: user.email,
        kycStatus: user.kycStatus
      };

    } catch (error) {
      // Log failure (sanitized - never log password)
      console.error('User registration failed', {
        email: validatedCommand.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });

      throw error;
    }
  }
}