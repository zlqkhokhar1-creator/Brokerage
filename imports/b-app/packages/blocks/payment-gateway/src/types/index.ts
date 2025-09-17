import { z } from 'zod';

// Payment enums
export const PaymentStatus = z.enum([
  'initialized',
  'authorized', 
  'captured',
  'refunded',
  'failed',
  'cancelled'
]);

export const PaymentMethod = z.enum([
  'card',
  'bank_transfer',
  'wallet',
  'crypto'
]);

export const Currency = z.enum([
  'USD',
  'EUR', 
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'BTC',
  'ETH'
]);

// Payment schema
export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  currency: Currency,
  status: PaymentStatus,
  method: PaymentMethod,
  metadata: z.record(z.string()).optional(),
  providerPaymentId: z.string().optional(),
  authorizedAmount: z.number().optional(),
  capturedAmount: z.number().optional(),
  refundedAmount: z.number().optional(),
  failureReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().default(1)
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatus>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type Currency = z.infer<typeof Currency>;

// Command schemas
export const InitializePaymentCommandSchema = z.object({
  amount: z.number().positive(),
  currency: Currency,
  method: PaymentMethod,
  metadata: z.record(z.string()).optional()
});

export type InitializePaymentCommand = z.infer<typeof InitializePaymentCommandSchema>;

export const AuthorizePaymentCommandSchema = z.object({
  paymentId: z.string().optional(),
  amount: z.number().positive().optional(),
  source: z.object({
    type: z.string(),
    token: z.string().optional(),
    details: z.record(z.any()).optional()
  }).optional()
}).refine(data => data.paymentId || (data.amount && data.source), {
  message: "Either paymentId or amount+source must be provided"
});

export type AuthorizePaymentCommand = z.infer<typeof AuthorizePaymentCommandSchema>;

export const CapturePaymentCommandSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive().optional() // if not provided, captures full authorized amount
});

export type CapturePaymentCommand = z.infer<typeof CapturePaymentCommandSchema>;

export const RefundPaymentCommandSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive().optional() // if not provided, refunds full captured amount
});

export type RefundPaymentCommand = z.infer<typeof RefundPaymentCommandSchema>;

export const GetPaymentCommandSchema = z.object({
  paymentId: z.string()
});

export type GetPaymentCommand = z.infer<typeof GetPaymentCommandSchema>;

// Provider interface
export interface PaymentProvider {
  readonly name: string;
  readonly supportedMethods: PaymentMethod[];
  readonly supportedCurrencies: Currency[];

  initialize(command: InitializePaymentCommand): Promise<PaymentProviderResult>;
  authorize(command: AuthorizePaymentCommand): Promise<PaymentProviderResult>;
  capture(command: CapturePaymentCommand): Promise<PaymentProviderResult>;
  refund(command: RefundPaymentCommand): Promise<PaymentProviderResult>;
  get(command: GetPaymentCommand): Promise<PaymentProviderResult>;
}

export interface PaymentProviderResult {
  success: boolean;
  paymentId: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  amount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Events
export interface PaymentInitializedEvent {
  type: 'payment.initialized.v1';
  paymentId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  provider: string;
  at: string;
  traceId?: string;
}

export interface PaymentAuthorizedEvent {
  type: 'payment.authorized.v1';
  paymentId: string;
  authorizedAmount: number;
  currency: Currency;
  provider: string;
  at: string;
  traceId?: string;
}

export interface PaymentCapturedEvent {
  type: 'payment.captured.v1';
  paymentId: string;
  capturedAmount: number;
  currency: Currency;
  provider: string;
  at: string;
  traceId?: string;
}

export interface PaymentRefundedEvent {
  type: 'payment.refunded.v1';
  paymentId: string;
  refundedAmount: number;
  currency: Currency;
  provider: string;
  at: string;
  traceId?: string;
}

export type PaymentEvent = 
  | PaymentInitializedEvent 
  | PaymentAuthorizedEvent 
  | PaymentCapturedEvent 
  | PaymentRefundedEvent;

// Repository interface
export interface PaymentRepository {
  create(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  update(id: string, patch: Partial<Payment>): Promise<Payment>;
  delete(id: string): Promise<void>;
}

// Idempotency
export interface IdempotencyService {
  checkKey(key: string, commandType: string): Promise<{ exists: boolean; result?: any }>;
  storeResult(key: string, commandType: string, result: any, ttlSeconds?: number): Promise<void>;
}

// Configuration
export interface PaymentGatewayConfig {
  defaultProvider: 'mock' | 'stripe' | 'custom';
  providers: {
    mock?: {
      enabled: boolean;
      deterministicIds?: boolean;
    };
    stripe?: {
      enabled: boolean;
      apiKey?: string;
      webhookSecret?: string;
    };
    custom?: {
      enabled: boolean;
      implementation?: string;
    };
  };
  idempotency?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}