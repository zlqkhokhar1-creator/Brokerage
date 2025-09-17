#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Migration {
  version: string;
  name: string;
  filename: string;
  content: string;
  checksum: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  applied_at: Date;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      max: 1, // Use single connection for migrations
    });

    this.migrationsDir = path.join(__dirname, '../migrations');
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private loadMigrations(): Migration[] {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];

    for (const filename of files) {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping invalid migration filename: ${filename}`);
        continue;
      }

      const [, version, name] = match;
      const filePath = path.join(this.migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = this.calculateChecksum(content);

      migrations.push({
        version,
        name,
        filename,
        content,
        checksum,
      });
    }

    // Check for duplicate versions
    const versions = migrations.map(m => m.version);
    const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate migration versions found: ${duplicates.join(', ')}`);
    }

    return migrations;
  }

  private async ensureSchemaMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await this.pool.query(query);
  }

  private async getAppliedMigrations(): Promise<AppliedMigration[]> {
    const result = await this.pool.query(
      'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version'
    );

    return result.rows;
  }

  private async verifyAppliedMigrations(migrations: Migration[], appliedMigrations: AppliedMigration[]): Promise<void> {
    for (const applied of appliedMigrations) {
      const migration = migrations.find(m => m.version === applied.version);
      
      if (!migration) {
        throw new Error(`Applied migration ${applied.version} (${applied.name}) not found in migration files`);
      }

      if (migration.checksum !== applied.checksum) {
        throw new Error(
          `Checksum mismatch for migration ${applied.version} (${applied.name})\n` +
          `  Expected: ${migration.checksum}\n` +
          `  Stored:   ${applied.checksum}\n` +
          `Migration files cannot be modified after they have been applied.`
        );
      }
    }
  }

  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);

    const client = await this.pool.connect();
    try {
      // Begin transaction for migration
      await client.query('BEGIN');

      // Execute migration SQL
      await client.query(migration.content);

      // Record migration in schema_migrations table
      await client.query(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, migration.checksum]
      );

      // Commit transaction
      await client.query('COMMIT');

      console.log(`✓ Applied migration ${migration.version}: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async plan(): Promise<void> {
    console.log('Migration Plan:');
    console.log('==============');

    try {
      await this.ensureSchemaMigrationsTable();
      
      const migrations = this.loadMigrations();
      const appliedMigrations = await this.getAppliedMigrations();

      await this.verifyAppliedMigrations(migrations, appliedMigrations);

      const appliedVersions = new Set(appliedMigrations.map(m => m.version));
      const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.version));

      if (appliedMigrations.length > 0) {
        console.log('\nApplied Migrations:');
        for (const applied of appliedMigrations) {
          console.log(`  ✓ ${applied.version}: ${applied.name} (${applied.applied_at.toISOString()})`);
        }
      }

      if (pendingMigrations.length > 0) {
        console.log('\nPending Migrations:');
        for (const pending of pendingMigrations) {
          console.log(`  → ${pending.version}: ${pending.name}`);
        }
      } else {
        console.log('\nNo pending migrations.');
      }

    } catch (error) {
      console.error('Error generating migration plan:', error);
      process.exit(1);
    }
  }

  async migrate(): Promise<void> {
    console.log('Running Migrations:');
    console.log('==================');

    try {
      await this.ensureSchemaMigrationsTable();
      
      const migrations = this.loadMigrations();
      const appliedMigrations = await this.getAppliedMigrations();

      await this.verifyAppliedMigrations(migrations, appliedMigrations);

      const appliedVersions = new Set(appliedMigrations.map(m => m.version));
      const pendingMigrations = migrations.filter(m => !appliedVersions.has(m.version));

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations to apply.');
        return;
      }

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      console.log(`\n✅ Successfully applied ${pendingMigrations.length} migration(s).`);

    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan');

  const runner = new MigrationRunner();

  try {
    if (isPlan) {
      await runner.plan();
    } else {
      await runner.migrate();
    }
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}