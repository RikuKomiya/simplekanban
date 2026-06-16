import type { Database } from '@simplekanban/db';
import type { User as DbUser } from '@simplekanban/db';
import type { ApiKeyScope } from '@simplekanban/shared';
import type { RealtimePublisher } from './realtime.ts';
import type { Auth, AuthMethods } from './auth.ts';

/**
 * Per-request runtime services. Constructed once per request (Workers) or once
 * per process (dev Bun) and stashed on the Hono context.
 */
export interface AppServices {
  db: Database;
  auth: Auth;
  authMethods: AuthMethods;
  publisher: RealtimePublisher;
}

/** Hono environment bindings + per-request variables. */
export interface AppEnv {
  Variables: {
    services: AppServices;
    /** Authenticated user (set by auth middleware). */
    user: DbUser;
    /**
     * When auth came from an API key, the workspace the key is scoped to.
     * `null` for cookie/session auth (multi-workspace).
     */
    apiKeyWorkspaceId: string | null;
    /** API key scopes when auth came from an API key; null for cookie/session auth. */
    apiKeyScopes: ApiKeyScope[] | null;
    /** Client id from `x-client-id` header (realtime echo suppression). */
    clientId: string | undefined;
  };
}
