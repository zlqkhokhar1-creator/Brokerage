import { z } from 'zod';

// User schema with versioning
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional(),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  investmentGoals: z.array(z.string()).optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  version: z.number().default(1),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = z.infer<typeof UserSchema>;

// Command schemas
export const RegisterUserCommandSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least 8 characters, including uppercase, lowercase, number and special character'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }).optional(),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  investmentGoals: z.array(z.string()).optional()
});

export type RegisterUserCommand = z.infer<typeof RegisterUserCommandSchema>;

export const AuthenticateUserCommandSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type AuthenticateUserCommand = z.infer<typeof AuthenticateUserCommandSchema>;

export const GetProfileCommandSchema = z.object({
  userId: z.string()
});

export type GetProfileCommand = z.infer<typeof GetProfileCommandSchema>;

export const UpdateProfileCommandSchema = z.object({
  userId: z.string(),
  patch: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string()
    }).optional(),
    riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    investmentGoals: z.array(z.string()).optional()
  })
});

export type UpdateProfileCommand = z.infer<typeof UpdateProfileCommandSchema>;

export const ValidateTokenCommandSchema = z.object({
  token: z.string()
});

export type ValidateTokenCommand = z.infer<typeof ValidateTokenCommandSchema>;

// Response types
export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresIn: number;
}

export interface ProfileResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  investmentGoals?: string[];
  kycStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenClaims {
  sub: string;  // userId
  email: string;
  iss: string;
  iat: number;
  exp: number;
  kid: string;
}

// JWT Configuration
export interface JWTConfig {
  issuer: string;
  accessTokenTTL: number;  // seconds
  refreshTokenTTL: number; // seconds
  algorithm: 'HS256' | 'RS256';
  keyRotationInterval: number; // seconds
}

// Key management
export interface SigningKey {
  id: string;
  algorithm: 'HS256' | 'RS256';
  key: string | Buffer;
  publicKey?: string | Buffer;
  createdAt: Date;
  isActive: boolean;
}

// Repository interfaces
export interface UserRepository {
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, patch: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

// Password service interface
export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

// Events
export interface UserRegisteredEvent {
  type: 'user.registered.v1';
  userId: string;
  email: string;
  createdAt: string;
  traceId?: string;
}

export interface UserProfileUpdatedEvent {
  type: 'user.profile.updated.v1';
  userId: string;
  updatedFields: string[];
  updatedAt: string;
  traceId?: string;
}

export interface UserAuthenticatedEvent {
  type: 'user.authenticated.v1';
  userId: string;
  method: 'password';
  at: string;
  traceId?: string;
}