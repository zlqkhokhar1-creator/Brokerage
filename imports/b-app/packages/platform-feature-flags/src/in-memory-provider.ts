import { 
  FeatureFlag, 
  FeatureFlagProvider, 
  FeatureFlagContext, 
  FeatureFlagCondition 
} from './types';

export class InMemoryFeatureFlagProvider implements FeatureFlagProvider {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor(initialFlags?: Record<string, boolean | FeatureFlag>) {
    if (initialFlags) {
      this.loadInitialFlags(initialFlags);
    }
  }

  async isEnabled(flagName: string, context?: FeatureFlagContext): Promise<boolean> {
    const flag = this.flags.get(flagName);
    
    if (!flag) {
      return false;
    }

    // If no conditions, return the base enabled state
    if (!flag.conditions || flag.conditions.length === 0) {
      return flag.enabled;
    }

    // If flag is disabled at base level, always return false
    if (!flag.enabled) {
      return false;
    }

    // Evaluate all conditions - all must pass
    for (const condition of flag.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagName) || null;
  }

  async setFlag(flag: FeatureFlag): Promise<void> {
    const now = new Date();
    const existingFlag = this.flags.get(flag.name);
    
    const updatedFlag: FeatureFlag = {
      ...flag,
      createdAt: existingFlag?.createdAt || now,
      updatedAt: now
    };

    this.flags.set(flag.name, updatedFlag);
  }

  async deleteFlag(flagName: string): Promise<boolean> {
    return this.flags.delete(flagName);
  }

  async listFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  private loadInitialFlags(initialFlags: Record<string, boolean | FeatureFlag>): void {
    for (const [name, flagData] of Object.entries(initialFlags)) {
      const flag: FeatureFlag = typeof flagData === 'boolean' 
        ? { name, enabled: flagData }
        : flagData;
      
      this.flags.set(name, flag);
    }
  }

  private evaluateCondition(
    condition: FeatureFlagCondition, 
    context?: FeatureFlagContext
  ): boolean {
    if (!context) {
      return false;
    }

    let contextValue: any;

    // Get the value from context based on condition type
    switch (condition.type) {
      case 'user':
        contextValue = context.userId;
        break;
      case 'role':
        contextValue = context.userRole;
        break;
      case 'environment':
        contextValue = context.environment;
        break;
      case 'percentage':
        // For percentage-based rollout, use user ID hash
        if (context.userId) {
          const hash = this.hashString(context.userId);
          contextValue = (hash % 100) + 1; // 1-100
        } else {
          return false;
        }
        break;
      case 'custom':
        contextValue = condition.field ? context[condition.field] : undefined;
        break;
      default:
        return false;
    }

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'contains':
        return typeof contextValue === 'string' && 
               contextValue.includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && 
               condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && 
               !condition.value.includes(contextValue);
      case 'greater_than':
        return typeof contextValue === 'number' && 
               contextValue > Number(condition.value);
      case 'less_than':
        return typeof contextValue === 'number' && 
               contextValue < Number(condition.value);
      default:
        return false;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Helper methods for easier flag management
  async enableFlag(flagName: string, description?: string): Promise<void> {
    await this.setFlag({
      name: flagName,
      enabled: true,
      description
    });
  }

  async disableFlag(flagName: string): Promise<void> {
    const existing = await this.getFlag(flagName);
    if (existing) {
      await this.setFlag({
        ...existing,
        enabled: false
      });
    }
  }

  // Get stats for monitoring
  getStats(): { totalFlags: number; enabledFlags: number } {
    let enabledFlags = 0;
    for (const flag of this.flags.values()) {
      if (flag.enabled) {
        enabledFlags++;
      }
    }

    return {
      totalFlags: this.flags.size,
      enabledFlags
    };
  }
}