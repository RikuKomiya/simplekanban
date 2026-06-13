import { createClient } from '@libsql/client';
import { resolve } from 'node:path';
import { createDb } from '@simplekanban/db';
import type { RealtimeEvent } from '@simplekanban/shared';
import { createApp } from './app.ts';
import { createAuth } from './auth.ts';
import { resolveAuth, type ResolvedAuth } from './middleware.ts';
import { runMigrations } from './migrate.ts';
import { InMemoryRealtime } from './realtime.ts';
import type { AppServices } from './types.ts';

const PORT = Number(process.env.PORT ?? 8787);

// Resolve repo-root paths. dev.ts lives at apps/server/src/dev.ts → up 3 levels.
const repoRoot = resolve(import.meta.dir, '../../..');
const dbPath = resolve(repoRoot, 'local.db');
const dbUrl = `file:${dbPath}`;
const migrationsDir = resolve(repoRoot, 'packages/db/migrations');

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:8787';
const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me-please-32chars!!';
const trustedOrigins = [
  'http://localhost:5173',
  'http://localhost:8787',
  BETTER_AUTH_URL,
];

// ---------------------------------------------------------------------------
// Apply migrations on boot.
// ---------------------------------------------------------------------------
const migrationClient = createClient({ url: dbUrl });
const applied = await runMigrations(migrationClient, migrationsDir);
if (applied.length > 0) {
  console.log(`[dev] applied migrations: ${applied.join(', ')}`);
} else {
  console.log('[dev] migrations up to date');
}
migrationClient.close();

// ---------------------------------------------------------------------------
// Shared services (single process: one db + auth + in-memory realtime).
// ---------------------------------------------------------------------------
const db = createDb({ url: dbUrl });
const auth = createAuth(db, {
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins,
});
const realtime = new InMemoryRealtime();
const services: AppServices = { db, auth, publisher: realtime };

// Per-socket metadata for room cleanup on close.
interface SocketData {
  workspaceId: string;
}

const app = createApp({
  services: () => services,
  corsOrigins: ['http://localhost:5173', 'http://localhost:8787'],
  // The actual upgrade is performed by Bun.serve (see fetch below); this hook
  // is only reached if a /ws request slips through without an Upgrade header.
  onWsUpgrade: (c) =>
    c.json(
      { error: { code: 'upgrade_required', message: 'WebSocket upgrade required' } },
      426,
    ),
});

const server = Bun.serve<SocketData>({
  port: PORT,
  async fetch(request, srv) {
    const url = new URL(request.url);

    // WebSocket upgrade for realtime: GET /api/v1/ws?workspace=<id>
    if (url.pathname === '/api/v1/ws') {
      const workspaceId = url.searchParams.get('workspace');
      if (!workspaceId) {
        return new Response(
          JSON.stringify({
            error: { code: 'bad_request', message: 'workspace query is required' },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Authenticate via the same dual path as REST (Bearer API key or
      // session cookie) so agents can subscribe to realtime too.
      let resolved: ResolvedAuth;
      try {
        resolved = await resolveAuth({ db, auth }, request.headers);
      } catch {
        return new Response(
          JSON.stringify({
            error: { code: 'unauthorized', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (resolved.apiKeyWorkspaceId && resolved.apiKeyWorkspaceId !== workspaceId) {
        return new Response(
          JSON.stringify({
            error: { code: 'forbidden', message: 'API key is scoped to another workspace' },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      const member = await isWorkspaceMember(workspaceId, resolved.user.id);
      if (!member) {
        return new Response(
          JSON.stringify({
            error: { code: 'forbidden', message: 'Not a workspace member' },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      const ok = srv.upgrade(request, { data: { workspaceId } });
      if (ok) return undefined as unknown as Response;
      return new Response('Upgrade failed', { status: 426 });
    }

    return app.fetch(request);
  },
  websocket: {
    open(ws) {
      realtime.add(ws.data.workspaceId, ws as unknown as WebSocket);
    },
    message(ws, message) {
      if (message === 'ping') ws.send('pong');
    },
    close(ws) {
      realtime.remove(ws.data.workspaceId, ws as unknown as WebSocket);
    },
  },
});

/** Membership check used by the dev WS gate (mirrors access.requireWorkspaceAccess). */
async function isWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { workspaceMember } = await import('@simplekanban/db');
  const { and, eq } = await import('drizzle-orm');
  const rows = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

console.log(`[dev] SimpleKanban server listening on http://localhost:${server.port}`);
console.log(`[dev] db: ${dbUrl}`);
