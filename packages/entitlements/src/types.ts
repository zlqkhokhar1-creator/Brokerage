import { z } from 'zod';

export const SubscriptionPlanSchema = z.enum(['free', 'basic', 'premium', 'enterprise']);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const FeatureFlagSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const EntitlementSchema = z.object({
  feature: z.string(),
  enabled: z.boolean(),
  limit: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

export const UserEntitlementsSchema = z.object({
  userId: z.string().uuid(),
  plan: SubscriptionPlanSchema,
  entitlements: z.array(EntitlementSchema),
  computedAt: z.string().datetime(),
});
export type UserEntitlements = z.infer<typeof UserEntitlementsSchema>;