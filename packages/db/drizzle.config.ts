import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:../../local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
