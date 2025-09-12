import { z } from 'zod';

// Command schemas
export const ExampleCommandInputSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().min(1),
  options: z.object({
    priority: z.enum(['low', 'medium', 'high']).default('medium')
  }).optional()
});

export const ExampleCommandOutputSchema = z.object({
  id: z.string(),
  result: z.string(),
  processedAt: z.string().datetime(),
  status: z.enum(['success', 'error'])
});

// Event schemas
export const ExampleEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  message: z.string(),
  processedAt: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

// Types
export type ExampleCommandInput = z.infer<typeof ExampleCommandInputSchema>;
export type ExampleCommandOutput = z.infer<typeof ExampleCommandOutputSchema>;
export type ExampleEvent = z.infer<typeof ExampleEventSchema>;
