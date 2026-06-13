import { and, eq } from 'drizzle-orm';
import {
  comment,
  cycle,
  issue,
  label,
  project,
  team,
  user as userTable,
  workflowState,
  workspace,
  workspaceMember,
  type Comment as DbComment,
  type Cycle as DbCycle,
  type Database,
  type Issue as DbIssue,
  type Label as DbLabel,
  type Project as DbProject,
  type Team as DbTeam,
  type User as DbUser,
  type WorkflowState as DbWorkflowState,
  type Workspace as DbWorkspace,
  type WorkspaceMember as DbWorkspaceMember,
} from '@simplekanban/db';
import { forbidden, notFound } from './errors.ts';
import type { AppEnv } from './types.ts';
import type { Context } from 'hono';

/** Look up the membership row for (workspace, user), or null. */
export async function getMembership(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<DbWorkspaceMember | null> {
  const rows = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Assert the current user may access `workspaceId`. Enforces:
 *  - membership in the workspace;
 *  - if authed via API key, the key's workspace must match.
 * Returns the membership row.
 */
export async function requireWorkspaceAccess(
  c: Context<AppEnv>,
  workspaceId: string,
): Promise<DbWorkspaceMember> {
  const { db } = c.var.services;
  const apiKeyWs = c.var.apiKeyWorkspaceId;
  if (apiKeyWs !== null && apiKeyWs !== workspaceId) {
    throw forbidden('API key is scoped to a different workspace');
  }
  const membership = await getMembership(db, workspaceId, c.var.user.id);
  if (!membership) {
    throw forbidden('You are not a member of this workspace');
  }
  return membership;
}

/** Fetch a workspace by id or 404. */
export async function getWorkspaceOr404(
  db: Database,
  workspaceId: string,
): Promise<DbWorkspace> {
  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  const ws = rows[0];
  if (!ws) throw notFound('Workspace not found');
  return ws;
}

/** Fetch a team by id (and verify workspace access) or 404/403. */
export async function getTeamWithAccess(
  c: Context<AppEnv>,
  teamId: string,
): Promise<DbTeam> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1);
  const t = rows[0];
  if (!t) throw notFound('Team not found');
  await requireWorkspaceAccess(c, t.workspaceId);
  return t;
}

/** Fetch an issue + its team (and verify workspace access) or 404/403. */
export async function getIssueWithAccess(
  c: Context<AppEnv>,
  issueId: string,
): Promise<{ issue: DbIssue; team: DbTeam }> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(issue)
    .where(eq(issue.id, issueId))
    .limit(1);
  const i = rows[0];
  if (!i) throw notFound('Issue not found');
  const t = await getTeamWithAccess(c, i.teamId);
  return { issue: i, team: t };
}

/** Fetch a workflow state + its team (and verify workspace access). */
export async function getStateWithAccess(
  c: Context<AppEnv>,
  stateId: string,
): Promise<{ state: DbWorkflowState; team: DbTeam }> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(workflowState)
    .where(eq(workflowState.id, stateId))
    .limit(1);
  const s = rows[0];
  if (!s) throw notFound('Workflow state not found');
  const t = await getTeamWithAccess(c, s.teamId);
  return { state: s, team: t };
}

/** Fetch a label (and verify workspace access). */
export async function getLabelWithAccess(
  c: Context<AppEnv>,
  labelId: string,
): Promise<DbLabel> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(label)
    .where(eq(label.id, labelId))
    .limit(1);
  const l = rows[0];
  if (!l) throw notFound('Label not found');
  await requireWorkspaceAccess(c, l.workspaceId);
  return l;
}

/** Fetch a project (and verify workspace access). */
export async function getProjectWithAccess(
  c: Context<AppEnv>,
  projectId: string,
): Promise<DbProject> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const p = rows[0];
  if (!p) throw notFound('Project not found');
  await requireWorkspaceAccess(c, p.workspaceId);
  return p;
}

/** Fetch a cycle + its team (and verify workspace access). */
export async function getCycleWithAccess(
  c: Context<AppEnv>,
  cycleId: string,
): Promise<{ cycle: DbCycle; team: DbTeam }> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(cycle)
    .where(eq(cycle.id, cycleId))
    .limit(1);
  const cy = rows[0];
  if (!cy) throw notFound('Cycle not found');
  const t = await getTeamWithAccess(c, cy.teamId);
  return { cycle: cy, team: t };
}

/** Fetch a comment + its issue + team (and verify workspace access). */
export async function getCommentWithAccess(
  c: Context<AppEnv>,
  commentId: string,
): Promise<{ comment: DbComment; issue: DbIssue; team: DbTeam }> {
  const { db } = c.var.services;
  const rows = await db
    .select()
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1);
  const cm = rows[0];
  if (!cm) throw notFound('Comment not found');
  const { issue: i, team: t } = await getIssueWithAccess(c, cm.issueId);
  return { comment: cm, issue: i, team: t };
}

/** Fetch a user by id, or null. */
export async function getUser(
  db: Database,
  userId: string,
): Promise<DbUser | null> {
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
