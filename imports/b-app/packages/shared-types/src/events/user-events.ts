import { z } from 'zod';

export const UserRegisteredEventSchema = z.object({
  eventType: z.literal('user.registered'),
  userId: z.string().uuid(),
  email: z.string().email(),
  registrationDate: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type UserRegisteredEvent = z.infer<typeof UserRegisteredEventSchema>;

export const UserLoginEventSchema = z.object({
  eventType: z.literal('user.login'),
  userId: z.string().uuid(),
  loginDate: z.string().datetime(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type UserLoginEvent = z.infer<typeof UserLoginEventSchema>;