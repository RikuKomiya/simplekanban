import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import { genId, project } from '@simplekanban/db';
import { CreateProjectInput, UpdateProjectInput } from '@simplekanban/shared';
import { getProjectWithAccess, requireWorkspaceAccess } from '../access.ts';
import { serializeProject } from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';
import type { RealtimeEvent } from '@simplekanban/shared';

export const projectsRouter = new Hono<AppEnv>();

/** Coerce an optional ISO string to a Date (or null) for date columns. */
function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

/** GET /workspaces/:ws/projects */
projectsRouter.get('/workspaces/:ws/projects', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.workspaceId, workspaceId))
    .orderBy(asc(project.sortOrder), asc(project.createdAt));
  return c.json({ data: rows.map(serializeProject) });
});

/** POST /workspaces/:ws/projects */
projectsRouter.post('/workspaces/:ws/projects', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const input = await parseBody(c, CreateProjectInput);

  const [created] = await db
    .insert(project)
    .values({
      id: genId(),
      workspaceId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      status: input.status ?? 'backlog',
      leadId: input.leadId ?? null,
      startDate: toDate(input.startDate) ?? null,
      targetDate: toDate(input.targetDate) ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: new Date(),
    })
    .returning();

  const serialized = serializeProject(created!);
  await publishProject(c, workspaceId, 'project.created', serialized);
  return c.json({ data: serialized }, 201);
});

/** GET /projects/:id */
projectsRouter.get('/projects/:id', async (c) => {
  const existing = await getProjectWithAccess(c, c.req.param('id'));
  return c.json({ data: serializeProject(existing) });
});

/** PATCH /projects/:id */
projectsRouter.patch('/projects/:id', async (c) => {
  const { db } = c.var.services;
  const existing = await getProjectWithAccess(c, c.req.param('id'));
  const input = await parseBody(c, UpdateProjectInput);

  const patch: Partial<typeof project.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.color !== undefined) patch.color = input.color;
  if (input.status !== undefined) patch.status = input.status;
  if (input.leadId !== undefined) patch.leadId = input.leadId;
  if (input.startDate !== undefined) patch.startDate = toDate(input.startDate);
  if (input.targetDate !== undefined) {
    patch.targetDate = toDate(input.targetDate);
  }
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  if (Object.keys(patch).length === 0) {
    return c.json({ data: serializeProject(existing) });
  }

  const [updated] = await db
    .update(project)
    .set(patch)
    .where(eq(project.id, existing.id))
    .returning();
  const serialized = serializeProject(updated!);
  await publishProject(c, existing.workspaceId, 'project.updated', serialized);
  return c.json({ data: serialized });
});

/** DELETE /projects/:id */
projectsRouter.delete('/projects/:id', async (c) => {
  const { db } = c.var.services;
  const existing = await getProjectWithAccess(c, c.req.param('id'));
  await db.delete(project).where(eq(project.id, existing.id));
  await publishProject(c, existing.workspaceId, 'project.deleted', {
    id: existing.id,
  });
  return c.body(null, 204);
});

async function publishProject(
  c: Parameters<typeof requireWorkspaceAccess>[0],
  workspaceId: string,
  type: Extract<RealtimeEvent['type'], `project.${string}`>,
  payload: unknown,
): Promise<void> {
  const event: RealtimeEvent = { type, payload };
  if (c.var.clientId !== undefined) event.origin = c.var.clientId;
  await c.var.services.publisher.publish(workspaceId, event);
}
