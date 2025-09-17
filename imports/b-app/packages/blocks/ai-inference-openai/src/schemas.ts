import { z } from 'zod';

// Command schemas
export const GenerateCompletionInputSchema = z.object({
  prompt: z.string().min(1).max(10000),
  model: z.string(),
  maxTokens: z.number().int().positive().max(4096),
  temperature: z.number().min(0).max(2),
  userId: z.string().min(1),
  systemMessage: z.string().optional(),
  context: z.record(z.any()).optional()
});

export const GenerateCompletionOutputSchema = z.object({
  completionId: z.string(),
  content: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }),
  finishReason: z.enum(['stop', 'length', 'content_filter', 'error']),
  createdAt: z.string().datetime(),
  error: z.string().optional()
});

// Event schemas
export const AICompletionGeneratedEventSchema = z.object({
  completionId: z.string(),
  userId: z.string(),
  model: z.string(),
  promptLength: z.number(),
  completionLength: z.number(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }),
  finishReason: z.string(),
  generatedAt: z.string().datetime(),
  context: z.record(z.any()).optional()
});

// Types
export type GenerateCompletionInput = z.infer<typeof GenerateCompletionInputSchema>;
export type GenerateCompletionOutput = z.infer<typeof GenerateCompletionOutputSchema>;
export type AICompletionGeneratedEvent = z.infer<typeof AICompletionGeneratedEventSchema>;