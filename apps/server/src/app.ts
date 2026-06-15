import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from './middleware.ts';
import { requireWorkspaceAccess } from './access.ts';
import { HttpError, errorBody } from './errors.ts';
import { openApiDocument } from './openapi.ts';
import { workspacesRouter } from './routes/workspaces.ts';
import { teamsRouter } from './routes/teams.ts';
import { issuesRouter } from './routes/issues.ts';
import { commentsRouter } from './routes/comments.ts';
import { labelsRouter } from './routes/labels.ts';
import { projectsRouter } from './routes/projects.ts';
import { cyclesRouter } from './routes/cycles.ts';
import { notificationsRouter } from './routes/notifications.ts';
import { apiKeysRouter } from './routes/apikeys.ts';
import type { Context } from 'hono';
import type { AppServices } from './types.ts';
import type { AppEnv } from './types.ts';

/** Hook for handling `GET /api/v1/ws` upgrades, supplied per runtime. */
export type WsUpgradeHandler = (
  c: Context<AppEnv>,
  workspaceId: string,
) => Promise<Response> | Response;

export interface CreateAppOptions {
  /** Build per-request services (db, auth, publisher). */
  services: (request: Request) => AppServices | Promise<AppServices>;
  /** Allowed CORS origins (dev cross-port). */
  corsOrigins: string[];
  /** Runtime-specific WebSocket upgrade handler. */
  onWsUpgrade?: WsUpgradeHandler;
}

/**
 * Build the runtime-independent Hono application. The caller injects a
 * `services` factory (db/auth/publisher), CORS origins, and an optional
 * WebSocket upgrade handler (Durable Object in prod, in-memory in dev).
 */
export function createApp(options: CreateAppOptions) {
  const app = new Hono<AppEnv>();

  // CORS for dev cross-origin (vite 5173 → server 8787). Credentials allowed.
  app.use(
    '*',
    cors({
      origin: options.corsOrigins,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'x-client-id'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  // Attach per-request services to every request.
  app.use('*', async (c, next) => {
    const services = await options.services(c.req.raw);
    c.set('services', services);
    await next();
  });

  // ---- better-auth handler (no app auth middleware) ----
  app.on(['GET', 'POST'], '/api/auth/*', (c) =>
    c.var.services.auth.handler(c.req.raw),
  );

  // ---- OpenAPI (public) ----
  app.get('/api/v1/openapi.json', (c) => c.json(openApiDocument));
  app.get('/api/v1/auth-methods', (c) => c.json(c.var.services.authMethods));

  // ---- Authenticated REST API ----
  const api = new Hono<AppEnv>();
  api.use('*', authMiddleware);

  // WebSocket upgrade (authenticated): GET /api/v1/ws?workspace=<id>
  api.get('/ws', async (c) => {
    const workspaceId = c.req.query('workspace');
    if (!workspaceId) {
      return c.json(errorBody('bad_request', 'workspace query is required'), 400);
    }
    await requireWorkspaceAccess(c, workspaceId);
    if (!options.onWsUpgrade) {
      return c.json(
        errorBody('not_implemented', 'WebSocket not supported in this runtime'),
        501,
      );
    }
    return options.onWsUpgrade(c as Context<AppEnv>, workspaceId);
  });

  api.route('/', workspacesRouter);
  api.route('/', teamsRouter);
  api.route('/', issuesRouter);
  api.route('/', commentsRouter);
  api.route('/', labelsRouter);
  api.route('/', projectsRouter);
  api.route('/', cyclesRouter);
  api.route('/', notificationsRouter);
  api.route('/', apiKeysRouter);
  app.route('/api/v1', api);

  // ---- Error handling ----
  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (err instanceof HTTPException) {
      return c.json(errorBody('http_error', err.message), err.status);
    }
    console.error('Unhandled error:', err);
    return c.json(
      errorBody('internal_error', 'An unexpected error occurred'),
      500,
    );
  });

  app.notFound((c) => c.json(errorBody('not_found', 'Route not found'), 404));

  return app;
}

export type App = ReturnType<typeof createApp>;
