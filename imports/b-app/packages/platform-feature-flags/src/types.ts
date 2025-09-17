export interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
  environment?: string;
  version?: string;
  [key: string]: any;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  conditions?: FeatureFlagCondition[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeatureFlagCondition {
  type: 'user' | 'role' | 'environment' | 'percentage' | 'custom';
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  field?: string; // For custom conditions
}

export interface FeatureFlagProvider {
  isEnabled(flagName: string, context?: FeatureFlagContext): Promise<boolean>;
  getFlag(flagName: string): Promise<FeatureFlag | null>;
  setFlag(flag: FeatureFlag): Promise<void>;
  deleteFlag(flagName: string): Promise<boolean>;
  listFlags(): Promise<FeatureFlag[]>;
}