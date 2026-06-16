import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { apiKey, user as userTable } from '@simplekanban/db';
import { API_KEY_PREFIX } from '@simplekanban/shared';
import type { ApiKeyScope } from '@simplekanban/shared';
import { sha256Hex } from './crypto.ts';
import { parseApiKeyScopes } from './serialize.ts';
import { unauthorized } from './errors.ts';
import type { AppEnv, AppServices } from './types.ts';

export interface ResolvedAuth {
  user: typeof userTable.$inferSelect;
  /** Non-null when authenticated via API key — scopes access to that workspace. */
  apiKeyWorkspaceId: string | null;
  /** Non-null when authenticated via API key — permission scopes for that key. */
  apiKeyScopes: ApiKeyScope[] | null;
}

/**
 * Resolve the current user from request headers via, in order:
 *   1. `Authorization: Bearer sk_...` → sha-256 lookup in `api_key`
 *      (updates `last_used_at`, scopes to the key's workspace).
 *   2. better-auth session cookie via `auth.api.getSession`.
 * Throws 401 if neither yields a user. Shared by the REST middleware and the
 * runtime-specific WebSocket upgrade gates so both auth paths stay identical.
 */
export async function resolveAuth(
  services: Pick<AppServices, 'db' | 'auth'>,
  headers: Headers,
): Promise<ResolvedAuth> {
  const { db, auth } = services;

  const authz = headers.get('authorization');
  if (authz && authz.startsWith('Bearer ')) {
    const token = authz.slice('Bearer '.length).trim();
    if (token.startsWith(API_KEY_PREFIX)) {
      const hashedKey = await sha256Hex(token);
      const rows = await db
        .select()
        .from(apiKey)
        .where(eq(apiKey.hashedKey, hashedKey))
        .limit(1);
      const key = rows[0];
      if (!key) {
        throw unauthorized('Invalid API key');
      }
      const userRows = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, key.userId))
        .limit(1);
      const u = userRows[0];
      if (!u) {
        throw unauthorized('Invalid API key');
      }
      // Best-effort last-used bump; failure must not block the request.
      await db
        .update(apiKey)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKey.id, key.id));

      return {
        user: u,
        apiKeyWorkspaceId: key.workspaceId,
        apiKeyScopes: parseApiKeyScopes(key.scopes),
      };
    }
    throw unauthorized('Invalid API key');
  }

  // Fall back to session cookie.
  const result = await auth.api.getSession({ headers });
  if (!result?.user) {
    throw unauthorized();
  }
  const userRows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, result.user.id))
    .limit(1);
  const u = userRows[0];
  if (!u) {
    throw unauthorized();
  }
  return { user: u, apiKeyWorkspaceId: null, apiKeyScopes: null };
}

/** Authentication middleware for all `/api/v1` routes. */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('clientId', c.req.header('x-client-id'));

  const resolved = await resolveAuth(c.var.services, c.req.raw.headers);
  c.set('user', resolved.user);
  c.set('apiKeyWorkspaceId', resolved.apiKeyWorkspaceId);
  c.set('apiKeyScopes', resolved.apiKeyScopes);
  await next();
};
