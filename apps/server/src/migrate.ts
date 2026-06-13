import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Client } from '@libsql/client';

/**
 * Apply any unapplied SQL migrations from `migrationsDir`. Applied files are
 * tracked in a simple `__migrations(name TEXT PRIMARY KEY, applied_at INTEGER)`
 * table. Each file is split on the drizzle `--> statement-breakpoint` marker.
 */
export async function runMigrations(
  client: Client,
  migrationsDir: string,
): Promise<string[]> {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS __migrations (
       name TEXT PRIMARY KEY,
       applied_at INTEGER NOT NULL
     )`,
  );

  const applied = new Set<string>();
  const existing = await client.execute('SELECT name FROM __migrations');
  for (const row of existing.rows) {
    applied.add(String(row.name));
  }

  const entries = await readdir(migrationsDir);
  const files = entries.filter((f) => f.endsWith('.sql')).sort();

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlText = await readFile(join(migrationsDir, file), 'utf8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Run all statements + the bookkeeping insert as one batch (transaction).
    await client.batch(
      [
        ...statements,
        {
          sql: 'INSERT INTO __migrations (name, applied_at) VALUES (?, ?)',
          args: [file, Date.now()],
        },
      ],
      'write',
    );
    newlyApplied.push(file);
  }

  return newlyApplied;
}
