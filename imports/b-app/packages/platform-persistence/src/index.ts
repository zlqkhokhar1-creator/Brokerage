export { DatabaseConfig, createDatabaseClient, DatabaseClientFactory } from './db';
export * from './types';
export * from './repositories';
export { DriftVerifier } from './verification/DriftVerifier';

import { Kysely, Transaction } from 'kysely';
import { Database } from './types';

/**
 * Transaction helper wrapper
 */
export async function withTransaction<T>(
  db: Kysely<Database>,
  callback: (trx: Transaction<Database>) => Promise<T>
): Promise<T> {
  return await db.transaction().execute(callback);
}