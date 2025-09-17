export interface EventBusInterface {
  publish<T = any>(eventName: string, data: T, metadata?: EventMetadata): Promise<void>;
  subscribe<T = any>(eventName: string, handler: EventHandler<T>): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface EventMetadata {
  source?: string;
  timestamp?: Date;
  traceId?: string;
  userId?: string;
  correlationId?: string;
  version?: string;
}

export interface EventHandler<T = any> {
  (data: T, metadata: EventMetadata): Promise<void> | void;
}

export interface EventEnvelope<T = any> {
  eventName: string;
  data: T;
  metadata: EventMetadata;
  publishedAt: Date;
}

export interface EventBusStats {
  totalPublished: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  errorCount: number;
}

export interface EventBusOptions {
  maxListeners?: number;
  enableStats?: boolean;
  errorHandler?: (error: Error, eventName: string, data: any) => void;
}