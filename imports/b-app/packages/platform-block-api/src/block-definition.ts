import { z } from 'zod';
import { BlockDefinition, BlockMetadata, BlockContext } from '@b-app/platform-core';

// Zod schema for block metadata validation
export const BlockMetadataSchema = z.object({
  name: z.string().min(1, 'Block name is required').regex(/^[a-z][a-z0-9-]*$/, 'Block name must be kebab-case'),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/, 'Version must follow semantic versioning'),
  kind: z.enum(['service', 'handler', 'middleware']),
  description: z.string().optional(),
  author: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  policies: z.object({
    authLevel: z.enum(['none', 'user', 'admin']).optional(),
    permissions: z.array(z.string()).optional(),
    rateLimit: z.object({
      maxRequests: z.number().positive(),
      windowMs: z.number().positive()
    }).optional()
  }).optional(),
  edge: z.boolean().optional(),
  health: z.object({
    endpoint: z.string().optional(),
    interval: z.number().positive().optional()
  }).optional()
});

export type ValidatedBlockMetadata = z.infer<typeof BlockMetadataSchema>;

// Helper function to define a block with type safety and validation
export function defineBlock<TCommands = Record<string, any>>(
  definition: Omit<BlockDefinition, 'metadata'> & {
    metadata: ValidatedBlockMetadata;
  }
): BlockDefinition {
  // Validate metadata
  const validatedMetadata = BlockMetadataSchema.parse(definition.metadata);

  return {
    ...definition,
    metadata: validatedMetadata as BlockMetadata,
  };
}

// Helper function to define a command with schema validation
export function defineCommand<TInput = any, TOutput = any>(config: {
  handler: (input: TInput, context: BlockContext) => Promise<TOutput>;
  inputSchema?: z.ZodSchema<TInput>;
  outputSchema?: z.ZodSchema<TOutput>;
  policies?: BlockMetadata['policies'];
}) {
  return {
    handler: config.handler,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    policies: config.policies
  };
}

// Helper function to define HTTP routes
export function defineRoute(config: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any, next: any) => void;
  middleware?: Array<(req: any, res: any, next: any) => void>;
}) {
  return config;
}

// Utility type for extracting command types
export type CommandHandler<T = any> = T extends { handler: infer H } 
  ? H extends (input: infer I, context: BlockContext) => Promise<infer O>
    ? { input: I; output: O }
    : never
  : never;