import { ValidateTokenCommand, ValidateTokenCommandSchema, TokenClaims } from '../types/index.js';
import { JWTService } from '../services/jwt.service.js';

export interface TokenValidationResult {
  valid: boolean;
  claims?: TokenClaims;
  error?: string;
}

export class ValidateTokenCommandHandler {
  constructor(private jwtService: JWTService) {}

  async execute(command: ValidateTokenCommand, traceId?: string): Promise<TokenValidationResult> {
    // Validate command
    const validatedCommand = ValidateTokenCommandSchema.parse(command);
    
    try {
      const claims = await this.jwtService.verifyToken(validatedCommand.token);

      console.info('Token validation successful', {
        userId: claims.sub,
        email: claims.email,
        keyId: claims.kid,
        traceId
      });

      return {
        valid: true,
        claims
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.warn('Token validation failed', {
        error: errorMessage,
        traceId
      });

      return {
        valid: false,
        error: errorMessage
      };
    }
  }
}