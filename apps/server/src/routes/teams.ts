import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import {
  genId,
  issue,
  seedTeamDefaults,
  team,
  workflowState,
  type NewWorkflowState,
} from '@simplekanban/db';
import {
  CreateStateInput,
  CreateTeamInput,
  UpdateStateInput,
  UpdateTeamInput,
} from '@simplekanban/shared';
import {
  getStateWithAccess,
  getTeamWithAccess,
  requireApiScope,
  requireWorkspaceAccess,
} from '../access.ts';
import { badRequest, conflict, forbidden } from '../errors.ts';
import {
  serializeTeam,
  serializeWorkflowState,
} from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';

export const teamsRouter = new Hono<AppEnv>();

/** GET /workspaces/:ws/teams */
teamsRouter.get('/workspaces/:ws/teams', async (c) => {
  requireApiScope(c, 'states:read');
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const rows = await db
    .select()
    .from(team)
    .where(eq(team.workspaceId, workspaceId))
    .orderBy(asc(team.createdAt));
  return c.json({ data: rows.map(serializeTeam) });
});

/** POST /workspaces/:ws/teams — create + seed default workflow states. */
teamsRouter.post('/workspaces/:ws/teams', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const input = await parseBody(c, CreateTeamInput);

  // Per-workspace key uniqueness → clean 409 instead of a raw constraint error.
  const dup = await db
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.workspaceId, workspaceId), eq(team.key, input.key)))
    .limit(1);
  if (dup.length > 0) {
    throw conflict('A team with that key already exists', 'key_taken');
  }

  const teamId = genId();
  const [created] = await db
    .insert(team)
    .values({
      id: teamId,
      workspaceId,
      name: input.name,
      key: input.key,
      color: input.color ?? null,
      icon: input.icon ?? null,
      createdAt: new Date(),
    })
    .returning();

  await seedTeamDefaults(db, teamId);

  return c.json({ data: serializeTeam(created!) }, 201);
});

/** GET /teams/:teamId */
teamsRouter.get('/teams/:teamId', async (c) => {
  requireApiScope(c, 'states:read');
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  return c.json({ data: serializeTeam(t) });
});

/** PATCH /teams/:teamId */
teamsRouter.patch('/teams/:teamId', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const input = await parseBody(c, UpdateTeamInput);

  const patch: Partial<typeof team.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.key !== undefined) patch.key = input.key;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;

  if (Object.keys(patch).length === 0) {
    return c.json({ data: serializeTeam(t) });
  }

  const [updated] = await db
    .update(team)
    .set(patch)
    .where(eq(team.id, t.id))
    .returning();
  return c.json({ data: serializeTeam(updated!) });
});

/** DELETE /teams/:teamId */
teamsRouter.delete('/teams/:teamId', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const membership = await requireWorkspaceAccess(c, t.workspaceId);
  if (membership.role !== 'admin') {
    throw forbidden('Only workspace admins can delete teams');
  }
  await db.delete(team).where(eq(team.id, t.id));
  return c.body(null, 204);
});

/** GET /teams/:teamId/states */
teamsRouter.get('/teams/:teamId/states', async (c) => {
  requireApiScope(c, 'states:read');
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const rows = await db
    .select()
    .from(workflowState)
    .where(eq(workflowState.teamId, t.id))
    .orderBy(asc(workflowState.position));
  return c.json({ data: rows.map(serializeWorkflowState) });
});

/** POST /teams/:teamId/states */
teamsRouter.post('/teams/:teamId/states', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const input = await parseBody(c, CreateStateInput);

  let position = input.position;
  if (position === undefined) {
    const last = await db
      .select({ position: workflowState.position })
      .from(workflowState)
      .where(eq(workflowState.teamId, t.id))
      .orderBy(asc(workflowState.position));
    const max = last.reduce((m, r) => Math.max(m, r.position), -1);
    position = max + 1;
  }

  const row: NewWorkflowState = {
    id: genId(),
    teamId: t.id,
    name: input.name,
    type: input.type,
    color: input.color,
    position,
  };
  const [created] = await db
    .insert(workflowState)
    .values(row)
    .returning();
  return c.json({ data: serializeWorkflowState(created!) }, 201);
});

/** PATCH /states/:id */
teamsRouter.patch('/states/:id', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const { state } = await getStateWithAccess(c, c.req.param('id'));
  const input = await parseBody(c, UpdateStateInput);

  const patch: Partial<typeof workflowState.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.color !== undefined) patch.color = input.color;
  if (input.position !== undefined) patch.position = input.position;

  if (Object.keys(patch).length === 0) {
    return c.json({ data: serializeWorkflowState(state) });
  }

  const [updated] = await db
    .update(workflowState)
    .set(patch)
    .where(eq(workflowState.id, state.id))
    .returning();
  return c.json({ data: serializeWorkflowState(updated!) });
});

/** DELETE /states/:id — refused if issues still reference the state. */
teamsRouter.delete('/states/:id', async (c) => {
  requireApiScope(c, 'states:write');
  const { db } = c.var.services;
  const { state } = await getStateWithAccess(c, c.req.param('id'));

  const used = await db
    .select({ id: issue.id })
    .from(issue)
    .where(eq(issue.stateId, state.id))
    .limit(1);
  if (used.length > 0) {
    throw badRequest(
      'Cannot delete a state that still has issues',
      'state_in_use',
    );
  }

  await db.delete(workflowState).where(eq(workflowState.id, state.id));
  return c.body(null, 204);
});
