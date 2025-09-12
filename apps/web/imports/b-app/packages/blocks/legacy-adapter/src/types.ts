import { z } from 'zod';

// Legacy API compatible types - maintains backward compatibility
export const LegacyUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(), // ISO string for legacy compatibility
  updatedAt: z.string()
});

export type LegacyUserResponse = z.infer<typeof LegacyUserResponseSchema>;

export const LegacyLoginResponseSchema = z.object({
  user: LegacyUserResponseSchema,
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number()
});

export type LegacyLoginResponse = z.infer<typeof LegacyLoginResponseSchema>;

// Legacy payment response types
export const LegacyPaymentResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type LegacyPaymentResponse = z.infer<typeof LegacyPaymentResponseSchema>;

// Deprecation warning interface
export interface DeprecationWarning {
  command: string;
  reason: string;
  replacement: string;
  deprecatedSince: string;
  removeIn?: string;
}