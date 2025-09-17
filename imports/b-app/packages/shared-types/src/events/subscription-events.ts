import { z } from 'zod';

export const SubscriptionPlanUpdatedEventSchema = z.object({
  eventType: z.literal('subscription.plan.updated'),
  userId: z.string().uuid(),
  previousPlan: z.string(),
  newPlan: z.string(),
  updatedAt: z.string().datetime(),
  effectiveDate: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type SubscriptionPlanUpdatedEvent = z.infer<typeof SubscriptionPlanUpdatedEventSchema>;

export const SubscriptionCreatedEventSchema = z.object({
  eventType: z.literal('subscription.created'),
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  plan: z.string(),
  createdAt: z.string().datetime(),
  startDate: z.string().datetime(),
});

export type SubscriptionCreatedEvent = z.infer<typeof SubscriptionCreatedEventSchema>;