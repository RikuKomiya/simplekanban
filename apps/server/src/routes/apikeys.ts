import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { apiKey, genId } from '@simplekanban/db';
import { CreateApiKeyInput } from '@simplekanban/shared';
import { requireWorkspaceAccess } from '../access.ts';
import { notFound } from '../errors.ts';
import { generateApiKey } from '../crypto.ts';
import { serializeApiKey } from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';

export const apiKeysRouter = new Hono<AppEnv>();

/** GET /workspaces/:ws/api-keys — caller's keys in this workspace. */
apiKeysRouter.get('/workspaces/:ws/api-keys', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const rows = await db
    .select()
    .from(apiKey)
    .where(
      and(
        eq(apiKey.workspaceId, workspaceId),
        eq(apiKey.userId, c.var.user.id),
      ),
    )
    .orderBy(asc(apiKey.createdAt));
  return c.json({ data: rows.map(serializeApiKey) });
});

/** POST /workspaces/:ws/api-keys — plaintext key returned only here. */
apiKeysRouter.post('/workspaces/:ws/api-keys', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const input = await parseBody(c, CreateApiKeyInput);

  const generated = await generateApiKey();
  const [created] = await db
    .insert(apiKey)
    .values({
      id: genId(),
      userId: c.var.user.id,
      workspaceId,
      name: input.name,
      hashedKey: generated.hashedKey,
      prefix: generated.prefix,
      lastUsedAt: null,
      createdAt: new Date(),
    })
    .returning();

  return c.json(
    {
      data: {
        ...serializeApiKey(created!),
        key: generated.plaintext,
      },
    },
    201,
  );
});

/** DELETE /api-keys/:id — owner only. */
apiKeysRouter.delete('/api-keys/:id', async (c) => {
  const { db } = c.var.services;
  const id = c.req.param('id');
  const rows = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.id, id))
    .limit(1);
  const existing = rows[0];
  if (!existing || existing.userId !== c.var.user.id) {
    throw notFound('API key not found');
  }
  await db.delete(apiKey).where(eq(apiKey.id, id));
  return c.body(null, 204);
});
