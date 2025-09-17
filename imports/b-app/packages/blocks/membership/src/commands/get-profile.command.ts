import { GetProfileCommand, GetProfileCommandSchema, ProfileResult } from '../types/index.js';
import { UserRepository } from '../types/index.js';

export class GetProfileCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async execute(command: GetProfileCommand, traceId?: string): Promise<ProfileResult> {
    // Validate command
    const validatedCommand = GetProfileCommandSchema.parse(command);
    
    try {
      const user = await this.userRepository.findById(validatedCommand.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Convert to profile result (excluding sensitive fields)
      const profile: ProfileResult = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        nationality: user.nationality,
        address: user.address,
        riskProfile: user.riskProfile,
        investmentGoals: user.investmentGoals,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.info('Profile retrieved', {
        userId: user.id,
        traceId
      });

      return profile;

    } catch (error) {
      console.error('Get profile failed', {
        userId: validatedCommand.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });

      throw error;
    }
  }
}