import { z } from 'zod';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}

export class ValidationWrapper {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          errors: result.error.errors.map(err => ({
            path: err.path.map(String),
            message: err.message,
            code: err.code
          }))
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          path: [],
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'unknown_error'
        }]
      };
    }
  }

  static validateAsync<T>(
    schema: z.ZodSchema<T>, 
    data: unknown
  ): Promise<ValidationResult<T>> {
    return Promise.resolve(ValidationWrapper.validate(schema, data));
  }

  // Middleware factory for Express-style request validation
  static createValidationMiddleware<T>(
    schema: z.ZodSchema<T>,
    property: 'body' | 'query' | 'params' = 'body'
  ) {
    return (req: any, res: any, next: any) => {
      const result = ValidationWrapper.validate(schema, req[property]);
      
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: result.errors
        });
      }

      // Replace the property with validated data
      req[property] = result.data;
      next();
    };
  }

  // Helper for validating command inputs/outputs
  static validateCommand<TInput, TOutput>(
    inputSchema: z.ZodSchema<TInput> | undefined,
    outputSchema: z.ZodSchema<TOutput> | undefined,
    input: unknown,
    output: unknown
  ): {
    inputValid: ValidationResult<TInput>;
    outputValid: ValidationResult<TOutput>;
  } {
    const inputValid = inputSchema 
      ? ValidationWrapper.validate(inputSchema, input)
      : { success: true, data: input as TInput };
      
    const outputValid = outputSchema 
      ? ValidationWrapper.validate(outputSchema, output)
      : { success: true, data: output as TOutput };

    return { inputValid, outputValid };
  }
}

// Common schema patterns
export const CommonSchemas = {
  // Standard API response schema
  apiResponse: <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    traceId: z.string().optional()
  }),

  // Pagination schema
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),

  // Error schema
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    path: z.array(z.string()).optional(),
    timestamp: z.string().datetime().optional(),
    traceId: z.string().optional()
  }),

  // Metadata schema
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
};

// Event schema utilities
export class EventSchemaUtil {
  static createEventSchema<T>(
    eventName: string,
    version: string,
    dataSchema: z.ZodSchema<T>
  ) {
    return z.object({
      eventName: z.literal(eventName),
      version: z.literal(version),
      data: dataSchema,
      metadata: z.object({
        timestamp: z.string().datetime(),
        source: z.string().optional(),
        traceId: z.string().optional(),
        correlationId: z.string().optional(),
        userId: z.string().optional()
      }),
      publishedAt: z.string().datetime()
    });
  }

  static validateEventSchema<T>(
    eventSchema: z.ZodSchema<T>,
    eventData: unknown
  ): ValidationResult<T> {
    return ValidationWrapper.validate(eventSchema, eventData);
  }
}