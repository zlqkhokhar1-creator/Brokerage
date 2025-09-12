import { PaymentProvider, PaymentGatewayConfig } from '../types/index.js';
import { MockPaymentProvider } from './mock.provider.js';
import { StripePaymentProvider } from './stripe.provider.js';

export class PaymentProviderFactory {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor(private config: PaymentGatewayConfig) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Mock Provider
    if (this.config.providers.mock?.enabled !== false) {
      const mockProvider = new MockPaymentProvider({
        deterministicIds: this.config.providers.mock?.deterministicIds || false
      });
      this.providers.set('mock', mockProvider);
      console.info('Mock payment provider initialized');
    }

    // Initialize Stripe Provider
    if (this.config.providers.stripe?.enabled) {
      const stripeProvider = new StripePaymentProvider({
        apiKey: this.config.providers.stripe.apiKey,
        webhookSecret: this.config.providers.stripe.webhookSecret
      });
      this.providers.set('stripe', stripeProvider);
      console.info('Stripe payment provider initialized');
    }

    // TODO: Initialize Custom Provider
    if (this.config.providers.custom?.enabled) {
      console.warn('Custom payment provider requested but not yet implemented');
      // const customProvider = await this.loadCustomProvider(this.config.providers.custom.implementation);
      // this.providers.set('custom', customProvider);
    }

    if (this.providers.size === 0) {
      throw new Error('No payment providers configured');
    }
  }

  getProvider(name?: string): PaymentProvider {
    const providerName = name || this.config.defaultProvider;
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not found or not enabled`);
    }

    return provider;
  }

  getDefaultProvider(): PaymentProvider {
    return this.getProvider();
  }

  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderSupported(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.providers.forEach((provider, name) => {
      stats[name] = {
        name: provider.name,
        supportedMethods: provider.supportedMethods,
        supportedCurrencies: provider.supportedCurrencies,
        // Add provider-specific stats if available
        ...(('getStats' in provider) && { providerStats: (provider as any).getStats() })
      };
    });

    return stats;
  }

  /**
   * TODO: Load custom provider implementation
   */
  private async loadCustomProvider(implementation?: string): Promise<PaymentProvider> {
    throw new Error('Custom provider loading not yet implemented - TODO for future phase');
  }
}