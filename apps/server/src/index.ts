import { DurableObject } from 'cloudflare:workers';
import { createDb } from '@simplekanban/db';
import type { RealtimeEvent } from '@simplekanban/shared';
import { createApp } from './app.ts';
import { createAuth } from './auth.ts';
import type { RealtimePublisher } from './realtime.ts';
import type { AppServices } from './types.ts';

/**
 * Worker bindings + secrets. The wrangler-generated `Env` (in
 * worker-configuration.d.ts) covers vars/bindings; secrets are declared here.
 */
export interface WorkerEnv {
  // Bindings
  WORKSPACE_ROOM: DurableObjectNamespace<WorkspaceRoom>;
  ASSETS: Fetcher;
  // Vars / secrets
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;
}

/**
 * RealtimePublisher backed by per-workspace Durable Objects. Publishing posts
 * the event JSON to the DO's internal `/publish` endpoint, which broadcasts to
 * every connected WebSocket.
 */
class DurableObjectPublisher implements RealtimePublisher {
  constructor(private readonly env: WorkerEnv) {}

  async publish(workspaceId: string, event: RealtimeEvent): Promise<void> {
    const id = this.env.WORKSPACE_ROOM.idFromName(workspaceId);
    const stub = this.env.WORKSPACE_ROOM.get(id);
    await stub.fetch('https://do/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }
}

function buildServices(env: WorkerEnv): AppServices {
  const db = createDb({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  const trustedOrigins = [env.BETTER_AUTH_URL];
  const auth = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins,
  });
  const publisher = new DurableObjectPublisher(env);
  return { db, auth, publisher };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = createApp({
      services: () => buildServices(env),
      corsOrigins: [env.BETTER_AUTH_URL],
      onWsUpgrade: async (c, workspaceId) => {
        const id = env.WORKSPACE_ROOM.idFromName(workspaceId);
        const stub = env.WORKSPACE_ROOM.get(id);
        // Forward the upgrade request to the DO.
        return stub.fetch(c.req.raw);
      },
    });

    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env);
    }
    // Static assets (SPA) for everything else.
    return env.ASSETS.fetch(request);
  },
};

/**
 * Per-workspace realtime room. Holds WebSocket connections (hibernation API)
 * and broadcasts events posted to `/publish`.
 */
export class WorkspaceRoom extends DurableObject<WorkerEnv> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/publish') {
      const event = (await request.json()) as RealtimeEvent;
      this.broadcast(event);
      return new Response(null, { status: 204 });
    }

    // WebSocket upgrade.
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      // Hibernation API: accept the socket on the DO.
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  /** Broadcast an event to all connected sockets. */
  private broadcast(event: RealtimeEvent): void {
    const data = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // Ignore broken sockets; runtime cleans them up.
      }
    }
  }

  /** Hibernation: respond to client pings; we don't expect inbound messages. */
  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong');
    }
  }

  override async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    try {
      ws.close(code);
    } catch {
      // Already closed.
    }
  }
}
