import { z } from 'zod';

// Command schemas
export const AuthorizePaymentInputSchema = z.object({
  amount: z.number().positive().int(), // Amount in cents
  currency: z.string().length(3).toUpperCase(), // ISO 4217 currency code
  paymentMethodId: z.string().min(1),
  userId: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

export const AuthorizePaymentOutputSchema = z.object({
  paymentId: z.string(),
  status: z.enum(['authorized', 'failed', 'pending']),
  amount: z.number(),
  currency: z.string(),
  createdAt: z.string().datetime(),
  stripePaymentIntentId: z.string().optional(),
  error: z.string().optional()
});

// Event schemas
export const PaymentAuthorizedEventSchema = z.object({
  paymentId: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentMethodId: z.string(),
  stripePaymentIntentId: z.string().optional(),
  authorizedAt: z.string().datetime(),
  metadata: z.record(z.string()).optional()
});

// Types
export type AuthorizePaymentInput = z.infer<typeof AuthorizePaymentInputSchema>;
export type AuthorizePaymentOutput = z.infer<typeof AuthorizePaymentOutputSchema>;
export type PaymentAuthorizedEvent = z.infer<typeof PaymentAuthorizedEventSchema>;