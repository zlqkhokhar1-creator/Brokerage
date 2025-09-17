import { z } from 'zod';

/**
 * CreateUser command input schema
 */
export const CreateUserInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
});

/**
 * CreateUser command output schema
 */
export const CreateUserOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  status: z.enum(['active', 'pending', 'suspended']),
});

/**
 * User registered event schema (v1)
 */
export const UserRegisteredEventV1Schema = z.object({
  eventId: z.string(),
  eventType: z.literal('user.registered.v1'),
  version: z.literal('1.0.0'),
  timestamp: z.string(),
  data: z.object({
    userId: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    registrationSource: z.literal('legacy'),
    createdAt: z.string(),
  }),
  metadata: z.object({
    traceId: z.string(),
    block: z.literal('legacy-adapter'),
    command: z.literal('CreateUser'),
    adapter: z.literal('legacy'),
  }),
});

/**
 * Type exports for TypeScript
 */
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;
export type UserRegisteredEventV1 = z.infer<typeof UserRegisteredEventV1Schema>;