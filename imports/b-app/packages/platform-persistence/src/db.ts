import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './types';

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Creates a new Kysely database client with connection pooling
 */
export function createDatabaseClient(config: DatabaseConfig): Kysely<Database> {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections || 20,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 30000,
    idleTimeoutMillis: 60000,
    allowExitOnIdle: false,
  });

  const dialect = new PostgresDialect({
    pool,
  });

  return new Kysely<Database>({
    dialect,
    // TODO: Add interceptors for metrics and logging in later PR
  });
}

/**
 * Database client factory with environment configuration
 */
export class DatabaseClientFactory {
  private static instance: Kysely<Database> | null = null;

  static create(config?: DatabaseConfig): Kysely<Database> {
    if (!this.instance) {
      const dbConfig = config || {
        connectionString: process.env.DATABASE_URL || '',
      };

      if (!dbConfig.connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      this.instance = createDatabaseClient(dbConfig);
    }

    return this.instance;
  }

  static getInstance(): Kysely<Database> {
    if (!this.instance) {
      throw new Error('Database client not initialized. Call create() first.');
    }
    return this.instance;
  }

  static async destroy(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }
}