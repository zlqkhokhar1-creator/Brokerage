import { UpdateProfileCommand, UpdateProfileCommandSchema, ProfileResult } from '../types/index.js';
import { UserRepository } from '../types/index.js';
import { membershipEvents } from '../events/event-emitter.js';

export class UpdateProfileCommandHandler {
  constructor(private userRepository: UserRepository) {}

  async execute(command: UpdateProfileCommand, traceId?: string): Promise<ProfileResult> {
    // Validate command
    const validatedCommand = UpdateProfileCommandSchema.parse(command);
    
    try {
      const existingUser = await this.userRepository.findById(validatedCommand.userId);
      
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Update user with patch
      const updatedUser = await this.userRepository.update(
        validatedCommand.userId, 
        {
          ...validatedCommand.patch,
          // Increment version for schema versioning
          version: existingUser.version + 1
        }
      );

      // Get updated field names for event
      const updatedFields = Object.keys(validatedCommand.patch);
      
      // Emit event
      membershipEvents.emitUserProfileUpdated(updatedUser.id, updatedFields, traceId);

      // Convert to profile result
      const profile: ProfileResult = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        dateOfBirth: updatedUser.dateOfBirth,
        nationality: updatedUser.nationality,
        address: updatedUser.address,
        riskProfile: updatedUser.riskProfile,
        investmentGoals: updatedUser.investmentGoals,
        kycStatus: updatedUser.kycStatus,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      console.info('Profile updated successfully', {
        userId: updatedUser.id,
        updatedFields,
        newVersion: updatedUser.version,
        traceId
      });

      return profile;

    } catch (error) {
      console.error('Profile update failed', {
        userId: validatedCommand.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });

      throw error;
    }
  }
}