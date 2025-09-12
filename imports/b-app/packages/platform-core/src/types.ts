export interface BlockMetadata {
  name: string;
  version: string;
  kind: 'service' | 'handler' | 'middleware';
  description?: string;
  author?: string;
  dependencies?: string[];
  policies?: {
    authLevel?: 'none' | 'user' | 'admin';
    permissions?: string[];
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
  };
  edge?: boolean;  // If true, routes are not prefixed with /api/blocks/<blockName>
  health?: {
    endpoint?: string;
    interval?: number;
  };
}

export interface BlockContext {
  logger: any; // Will be from platform-observability
  eventBus: any; // Will be from platform-eventbus 
  config: Record<string, any>;
  registry: TokenRegistry;
  tracer: any; // Will be from platform-observability
  metrics: any; // Will be from platform-observability
}

export interface BlockDefinition {
  metadata: BlockMetadata;
  register: (context: BlockContext) => Promise<void>;
  httpRoutes?: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: (req: any, res: any, next: any) => void;
    middleware?: Array<(req: any, res: any, next: any) => void>;
  }>;
  commands?: Record<string, {
    handler: (input: any, context: BlockContext) => Promise<any>;
    inputSchema?: any; // zod schema
    outputSchema?: any; // zod schema
    policies?: BlockMetadata['policies'];
  }>;
  shutdown?: () => Promise<void>;
}

export interface LoadedBlock {
  definition: BlockDefinition;
  metadata: BlockMetadata;
  status: 'loaded' | 'registered' | 'error';
  error?: string;
  registeredAt?: Date;
}

export type TokenRegistry = Map<string, any>;

export interface LifecycleManager {
  initialize(): Promise<void>;
  registerBlock(block: LoadedBlock): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    blocks: Record<string, {
      status: string;
      version: string;
      health?: any;
    }>;
  }>;
}