import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  account,
  session,
  user,
  verification,
  type Database,
} from '@simplekanban/db';

export interface AuthConfig {
  secret: string;
  baseURL: string;
  /** Extra trusted origins (dev: vite 5173 + server 8787). */
  trustedOrigins: string[];
}

/**
 * Build a better-auth instance bound to the given drizzle database.
 *
 * Constructed per-request on Workers (env-derived db) and once per process in
 * dev. Email/password is enabled with auto sign-in and no email verification so
 * signup yields an immediately usable session cookie.
 */
export function createAuth(db: Database, config: AuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user, session, account, verification },
    }),
  });
}

export type Auth = ReturnType<typeof createAuth>;
