import axios, { AxiosInstance } from 'axios';
// import { RequestContext, ResponseContext } from '@brokerage/platform-http';
import {
  CreateUserInput,
  CreateUserOutput,
  CreateUserInputSchema,
  CreateUserOutputSchema,
  UserRegisteredEventV1,
  UserRegisteredEventV1Schema,
} from '../schemas';
import { EventPublisher } from '../events/publisher';

// Local interfaces for testing
interface RequestContext {
  traceId: string;
  method: string;
  path: string;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string>;
  ip: string;
  user?: any;
  startTime: number;
}

interface ResponseContext {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export class CreateUserHandler {
  private httpClient: AxiosInstance;
  private eventPublisher: EventPublisher;
  private legacyBaseUrl: string;

  constructor(eventPublisher: EventPublisher, legacyBaseUrl?: string) {
    this.legacyBaseUrl = legacyBaseUrl || process.env.LEGACY_BASE_URL || 'http://localhost:5001';
    this.eventPublisher = eventPublisher;
    
    this.httpClient = axios.create({
      baseURL: this.legacyBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'legacy-adapter/0.1.0',
      },
    });
  }

  /**
   * Handle CreateUser command by calling legacy backend registration endpoint
   */
  async handle(ctx: RequestContext): Promise<ResponseContext> {
    try {
      // Validate input
      const input = CreateUserInputSchema.parse(ctx.body);

      console.log({
        traceId: ctx.traceId,
        command: 'CreateUser',
        block: 'legacy-adapter',
        adapter: 'legacy',
        input: { ...input, password: '[REDACTED]' },
      }, 'Processing CreateUser command');

      // Call legacy backend registration endpoint
      const legacyResponse = await this.httpClient.post('/api/v1/register', {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        phoneNumber: input.phoneNumber,
      });

      // Transform legacy response to our output format
      const output: CreateUserOutput = {
        id: legacyResponse.data.id || legacyResponse.data.userId || `user_${Date.now()}`,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        createdAt: legacyResponse.data.createdAt || new Date().toISOString(),
        status: legacyResponse.data.status || 'active',
      };

      // Validate output
      const validatedOutput = CreateUserOutputSchema.parse(output);

      // Publish user.registered.v1 event
      const event: UserRegisteredEventV1 = {
        eventId: `evt_${ctx.traceId}_${Date.now()}`,
        eventType: 'user.registered.v1',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          userId: output.id,
          email: output.email,
          firstName: output.firstName,
          lastName: output.lastName,
          registrationSource: 'legacy',
          createdAt: output.createdAt,
        },
        metadata: {
          traceId: ctx.traceId,
          block: 'legacy-adapter',
          command: 'CreateUser',
          adapter: 'legacy',
        },
      };

      // Validate and publish event
      const validatedEvent = UserRegisteredEventV1Schema.parse(event);
      await this.eventPublisher.publish(validatedEvent);

      console.log({
        traceId: ctx.traceId,
        command: 'CreateUser',
        block: 'legacy-adapter',
        adapter: 'legacy',
        userId: output.id,
        durationMs: Date.now() - ctx.startTime,
        success: true,
      }, 'CreateUser command completed successfully');

      return {
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: validatedOutput,
      };

    } catch (error) {
      const err = error as any; // Use 'any' to handle axios errors and other error types
      console.error({
        traceId: ctx.traceId,
        command: 'CreateUser',
        block: 'legacy-adapter',
        adapter: 'legacy',
        error: err.message,
        durationMs: Date.now() - ctx.startTime,
        success: false,
      }, 'CreateUser command failed');

      // Handle different error types
      if (err.response?.status === 409) {
        return {
          status: 409,
          headers: { 'content-type': 'application/json' },
          body: {
            error: 'User already exists',
            code: 'USER_EXISTS',
            traceId: ctx.traceId,
          },
        };
      }

      if (err.name === 'ZodError') {
        return {
          status: 400,
          headers: { 'content-type': 'application/json' },
          body: {
            error: 'Validation error',
            details: err.errors,
            traceId: ctx.traceId,
          },
        };
      }

      // Generic error response
      return {
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: {
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? err.message : undefined,
          traceId: ctx.traceId,
        },
      };
    }
  }
}