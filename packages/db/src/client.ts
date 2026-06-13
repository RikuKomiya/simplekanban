import { createClient, type Config } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as relations from './relations.js';
import * as schema from './schema.js';

export interface CreateDbOptions {
  /** libSQL connection URL (e.g. `file:../../local.db` or `libsql://...`). */
  url: string;
  /** Turso auth token for remote databases. */
  authToken?: string;
}

/** Full schema object (tables + relations) handed to drizzle. */
const fullSchema = { ...schema, ...relations };

export type Schema = typeof fullSchema;

/**
 * Create a Drizzle database client backed by `@libsql/client`.
 */
export function createDb(options: CreateDbOptions) {
  const config: Config = { url: options.url };
  if (options.authToken !== undefined) {
    config.authToken = options.authToken;
  }
  const client = createClient(config);
  return drizzle(client, { schema: fullSchema });
}

export type Database = ReturnType<typeof createDb>;
