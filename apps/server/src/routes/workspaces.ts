import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import {
  genId,
  label,
  team,
  user as userTable,
  workspace,
  workspaceMember,
  type NewWorkspace,
} from '@simplekanban/db';
import {
  CreateWorkspaceInput,
  InviteMemberInput,
} from '@simplekanban/shared';
import {
  getWorkspaceOr404,
  requireApiScope,
  requireWorkspaceAccess,
} from '../access.ts';
import { conflict, forbidden, notFound } from '../errors.ts';
import {
  serializeLabel,
  serializeTeam,
  serializeUser,
  serializeWorkspace,
  serializeWorkspaceMemberWithUser,
} from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';

export const workspacesRouter = new Hono<AppEnv>();

/** GET /me — current user + workspaces they belong to. */
workspacesRouter.get('/me', async (c) => {
  const { db } = c.var.services;
  const me = c.var.user;

  const memberships = await db
    .select({ workspace })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, me.id))
    .orderBy(asc(workspace.createdAt));

  return c.json({
    data: {
      user: serializeUser(me),
      workspaces: memberships.map((m) => serializeWorkspace(m.workspace)),
    },
  });
});

/** POST /workspaces — create workspace, creator becomes admin. */
workspacesRouter.post('/workspaces', async (c) => {
  const { db } = c.var.services;
  const me = c.var.user;

  // API keys are workspace-scoped; they cannot create new workspaces.
  if (c.var.apiKeyWorkspaceId !== null) {
    throw forbidden('API keys cannot create workspaces');
  }

  const input = await parseBody(c, CreateWorkspaceInput);

  const existing = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, input.slug))
    .limit(1);
  if (existing.length > 0) {
    throw conflict('A workspace with that slug already exists', 'slug_taken');
  }

  const workspaceId = genId();
  const wsRow: NewWorkspace = {
    id: workspaceId,
    name: input.name,
    slug: input.slug,
    createdAt: new Date(),
  };

  await db.batch([
    db.insert(workspace).values(wsRow),
    db.insert(workspaceMember).values({
      id: genId(),
      workspaceId,
      userId: me.id,
      role: 'admin',
      createdAt: new Date(),
    }),
  ]);

  const created = await getWorkspaceOr404(db, workspaceId);
  return c.json({ data: serializeWorkspace(created) }, 201);
});

/** GET /workspaces/:ws — detail (teams, members, labels). */
workspacesRouter.get('/workspaces/:ws', async (c) => {
  requireApiScope(c, 'members:read');
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);
  const ws = await getWorkspaceOr404(db, workspaceId);

  const teams = await db
    .select()
    .from(team)
    .where(eq(team.workspaceId, workspaceId))
    .orderBy(asc(team.createdAt));

  const memberRows = await db
    .select({ member: workspaceMember, user: userTable })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(eq(workspaceMember.workspaceId, workspaceId))
    .orderBy(asc(workspaceMember.createdAt));

  const labels = await db
    .select()
    .from(label)
    .where(eq(label.workspaceId, workspaceId))
    .orderBy(asc(label.name));

  return c.json({
    data: {
      ...serializeWorkspace(ws),
      teams: teams.map(serializeTeam),
      members: memberRows.map((m) =>
        serializeWorkspaceMemberWithUser(m.member, m.user),
      ),
      labels: labels.map(serializeLabel),
    },
  });
});

/** POST /workspaces/:ws/members — invite an existing user by email. */
workspacesRouter.post('/workspaces/:ws/members', async (c) => {
  requireApiScope(c, 'members:write');
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  const membership = await requireWorkspaceAccess(c, workspaceId);
  if (membership.role !== 'admin') {
    throw forbidden('Only workspace admins can invite members');
  }

  const input = await parseBody(c, InviteMemberInput);

  const userRows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, input.email))
    .limit(1);
  const target = userRows[0];
  if (!target) {
    throw notFound('No user exists with that email');
  }

  const existing = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, target.id),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    throw conflict('User is already a member', 'already_member');
  }

  const [memberRow] = await db
    .insert(workspaceMember)
    .values({
      id: genId(),
      workspaceId,
      userId: target.id,
      role: input.role ?? 'member',
      createdAt: new Date(),
    })
    .returning();

  return c.json(
    { data: serializeWorkspaceMemberWithUser(memberRow!, target) },
    201,
  );
});
