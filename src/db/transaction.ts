import { db } from './pool.js';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Execute an operation within a database transaction.
 * Automatically rolls back if an exception is thrown.
 */
export async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    return fn(tx);
  });
}
