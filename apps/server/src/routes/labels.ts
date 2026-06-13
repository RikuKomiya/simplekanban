import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import { genId, label } from '@simplekanban/db';
import { CreateLabelInput, UpdateLabelInput } from '@simplekanban/shared';
import { getLabelWithAccess, requireWorkspaceAccess } from '../access.ts';
import { serializeLabel } from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';
import type { RealtimeEvent } from '@simplekanban/shared';

export const labelsRouter = new Hono<AppEnv>();

/** GET /workspaces/:ws/labels */
labelsRouter.get('/workspaces/:ws/labels', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const rows = await db
    .select()
    .from(label)
    .where(eq(label.workspaceId, workspaceId))
    .orderBy(asc(label.name));
  return c.json({ data: rows.map(serializeLabel) });
});

/** POST /workspaces/:ws/labels */
labelsRouter.post('/workspaces/:ws/labels', async (c) => {
  const { db, publisher } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const input = await parseBody(c, CreateLabelInput);

  const [created] = await db
    .insert(label)
    .values({
      id: genId(),
      workspaceId,
      name: input.name,
      color: input.color,
    })
    .returning();

  const serialized = serializeLabel(created!);
  await publishLabel(c, workspaceId, 'label.created', serialized);
  return c.json({ data: serialized }, 201);
});

/** PATCH /labels/:id */
labelsRouter.patch('/labels/:id', async (c) => {
  const { db } = c.var.services;
  const existing = await getLabelWithAccess(c, c.req.param('id'));
  const input = await parseBody(c, UpdateLabelInput);

  const patch: Partial<typeof label.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (Object.keys(patch).length === 0) {
    return c.json({ data: serializeLabel(existing) });
  }

  const [updated] = await db
    .update(label)
    .set(patch)
    .where(eq(label.id, existing.id))
    .returning();
  const serialized = serializeLabel(updated!);
  await publishLabel(c, existing.workspaceId, 'label.updated', serialized);
  return c.json({ data: serialized });
});

/** DELETE /labels/:id */
labelsRouter.delete('/labels/:id', async (c) => {
  const { db } = c.var.services;
  const existing = await getLabelWithAccess(c, c.req.param('id'));
  await db.delete(label).where(eq(label.id, existing.id));
  await publishLabel(c, existing.workspaceId, 'label.deleted', {
    id: existing.id,
  });
  return c.body(null, 204);
});

async function publishLabel(
  c: Parameters<typeof requireWorkspaceAccess>[0],
  workspaceId: string,
  type: Extract<RealtimeEvent['type'], `label.${string}`>,
  payload: unknown,
): Promise<void> {
  const event: RealtimeEvent = { type, payload };
  if (c.var.clientId !== undefined) event.origin = c.var.clientId;
  await c.var.services.publisher.publish(workspaceId, event);
}
