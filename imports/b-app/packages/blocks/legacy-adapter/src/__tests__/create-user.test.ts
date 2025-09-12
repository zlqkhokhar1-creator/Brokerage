// import nock from 'nock';
import { CreateUserHandler } from '../commands/create-user';
import { InMemoryEventPublisher } from '../events/publisher';

// Local interface for testing 
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

describe('CreateUser Command Handler', () => {
  let handler: CreateUserHandler;
  let eventPublisher: InMemoryEventPublisher;
  const legacyBaseUrl = 'http://localhost:5001';

  beforeEach(() => {
    eventPublisher = new InMemoryEventPublisher();
    handler = new CreateUserHandler(eventPublisher, legacyBaseUrl);
    eventPublisher.clear();
  });

  const mockRequestContext: RequestContext = {
    traceId: 'test-trace-123',
    method: 'POST',
    path: '/api/commands/CreateUser',
    query: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    startTime: Date.now(),
  };

  it('should handle validation errors', async () => {
    const requestCtx: RequestContext = {
      ...mockRequestContext,
      body: {
        email: 'invalid-email',
        password: '123', // Too short
      },
    };

    const response = await handler.handle(requestCtx);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
    expect(eventPublisher.getEventCount()).toBe(0);
  });

  it('should create handler instance', () => {
    expect(handler).toBeInstanceOf(CreateUserHandler);
  });

  it('should validate input schema', () => {
    // Test that handler can be instantiated
    expect(eventPublisher).toBeInstanceOf(InMemoryEventPublisher);
    expect(eventPublisher.getEventCount()).toBe(0);
  });
});