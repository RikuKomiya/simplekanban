import { Hono } from 'hono';
import { asc, eq, sql } from 'drizzle-orm';
import { cycle, genId } from '@simplekanban/db';
import { CreateCycleInput, UpdateCycleInput } from '@simplekanban/shared';
import { getCycleWithAccess, getTeamWithAccess } from '../access.ts';
import { serializeCycle } from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';
import type { RealtimeEvent } from '@simplekanban/shared';

export const cyclesRouter = new Hono<AppEnv>();

/** GET /teams/:teamId/cycles */
cyclesRouter.get('/teams/:teamId/cycles', async (c) => {
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const rows = await db
    .select()
    .from(cycle)
    .where(eq(cycle.teamId, t.id))
    .orderBy(asc(cycle.number));
  return c.json({ data: rows.map(serializeCycle) });
});

/** POST /teams/:teamId/cycles — atomic per-team number. */
cyclesRouter.post('/teams/:teamId/cycles', async (c) => {
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const input = await parseBody(c, CreateCycleInput);

  const cycleId = genId();
  const now = Date.now();
  await db.run(sql`
    INSERT INTO ${cycle} (id, team_id, number, name, starts_at, ends_at, created_at)
    SELECT
      ${cycleId}, ${t.id},
      COALESCE((SELECT MAX(number) FROM ${cycle} WHERE team_id = ${t.id}), 0) + 1,
      ${input.name ?? null},
      ${new Date(input.startsAt).getTime()},
      ${new Date(input.endsAt).getTime()},
      ${now}
  `);

  const rows = await db
    .select()
    .from(cycle)
    .where(eq(cycle.id, cycleId))
    .limit(1);
  const created = rows[0]!;
  const serialized = serializeCycle(created);
  await publishCycle(c, t.workspaceId, 'cycle.created', serialized);
  return c.json({ data: serialized }, 201);
});

/** GET /cycles/:id */
cyclesRouter.get('/cycles/:id', async (c) => {
  const { cycle: existing } = await getCycleWithAccess(c, c.req.param('id'));
  return c.json({ data: serializeCycle(existing) });
});

/** PATCH /cycles/:id */
cyclesRouter.patch('/cycles/:id', async (c) => {
  const { db } = c.var.services;
  const { cycle: existing, team: t } = await getCycleWithAccess(
    c,
    c.req.param('id'),
  );
  const input = await parseBody(c, UpdateCycleInput);

  const patch: Partial<typeof cycle.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.startsAt !== undefined) patch.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) patch.endsAt = new Date(input.endsAt);

  if (Object.keys(patch).length === 0) {
    return c.json({ data: serializeCycle(existing) });
  }

  const [updated] = await db
    .update(cycle)
    .set(patch)
    .where(eq(cycle.id, existing.id))
    .returning();
  const serialized = serializeCycle(updated!);
  await publishCycle(c, t.workspaceId, 'cycle.updated', serialized);
  return c.json({ data: serialized });
});

/** DELETE /cycles/:id */
cyclesRouter.delete('/cycles/:id', async (c) => {
  const { db } = c.var.services;
  const { cycle: existing, team: t } = await getCycleWithAccess(
    c,
    c.req.param('id'),
  );
  await db.delete(cycle).where(eq(cycle.id, existing.id));
  await publishCycle(c, t.workspaceId, 'cycle.deleted', { id: existing.id });
  return c.body(null, 204);
});

async function publishCycle(
  c: Parameters<typeof getTeamWithAccess>[0],
  workspaceId: string,
  type: Extract<RealtimeEvent['type'], `cycle.${string}`>,
  payload: unknown,
): Promise<void> {
  const event: RealtimeEvent = { type, payload };
  if (c.var.clientId !== undefined) event.origin = c.var.clientId;
  await c.var.services.publisher.publish(workspaceId, event);
}
