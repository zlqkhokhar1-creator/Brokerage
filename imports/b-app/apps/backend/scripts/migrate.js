/**
 * Database Migration Runner
 * Applies SQL migrations in order
 */

const fs = require('fs');
const path = require('path');
const { query, transaction } = require('../src/config/database');
const { logger } = require('../src/utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

// Create migrations table to track applied migrations
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Get list of migration files
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('Migrations directory not found:', MIGRATIONS_DIR);
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && file.match(/^\d+_/))
    .sort();
}

// Get applied migrations from database
async function getAppliedMigrations() {
  try {
    const result = await query('SELECT version FROM schema_migrations ORDER BY version');
    return result.rows.map(row => row.version);
  } catch (error) {
    if (error.code === '42P01') { // Table doesn't exist
      return [];
    }
    throw error;
  }
}

// Apply a single migration
async function applyMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  const version = filename.replace('.sql', '');
  
  logger.info(`Applying migration: ${filename}`);
  
  await transaction(async (tx) => {
    // Execute the migration SQL
    await tx.query(sql);
    
    // Record that this migration was applied
    await tx.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      [version]
    );
  });
  
  logger.info(`Migration applied successfully: ${filename}`);
}

// Main migration function
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get migration files and applied migrations
    const migrationFiles = getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();
    
    // Filter out already applied migrations
    const pendingMigrations = migrationFiles.filter(file => {
      const version = file.replace('.sql', '');
      return !appliedMigrations.includes(version);
    });
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }
    
    logger.info(`Found ${pendingMigrations.length} pending migrations`);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    logger.info('All migrations applied successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations, getMigrationFiles, getAppliedMigrations };