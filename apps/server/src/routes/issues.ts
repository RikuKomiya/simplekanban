import { Hono } from 'hono';
import { and, asc, desc, eq, gt, inArray, like, or, sql } from 'drizzle-orm';
import {
  comment,
  genId,
  issue,
  issueLabel,
  label,
  project as projectTable,
  team,
  user as userTable,
  workflowState,
  type Issue as DbIssue,
} from '@simplekanban/db';
import {
  AddIssueLabelInput,
  CreateCommentInput,
  CreateIssueInput,
  IssueListFilters,
  parseIdentifier,
  PRIORITY_LABELS,
  sortOrderBetween,
  UpdateIssueInput,
  type PriorityValue,
  type RealtimeEvent,
} from '@simplekanban/shared';
import {
  getIssueWithAccess,
  getMembership,
  getTeamWithAccess,
  requireWorkspaceAccess,
} from '../access.ts';
import { badRequest, notFound } from '../errors.ts';
import {
  loadIssueDetail,
  toIssuesWithRelations,
  getDefaultStateId,
  stateBelongsToTeam,
} from '../loaders.ts';
import { serializeComment } from '../serialize.ts';
import {
  createNotification,
  getIssueParticipants,
  recordActivity,
} from '../sideeffects.ts';
import { parseBody, parseInput } from '../validate.ts';
import type { AppEnv } from '../types.ts';
import type { Context } from 'hono';

export const issuesRouter = new Hono<AppEnv>();

/** Human-readable priority label with a raw-number fallback. */
function priorityLabel(p: number): string {
  return PRIORITY_LABELS[p as PriorityValue] ?? String(p);
}

/** Publish a realtime event with the request's client id as origin. */
async function publish(
  c: Context<AppEnv>,
  workspaceId: string,
  type: RealtimeEvent['type'],
  payload: unknown,
): Promise<void> {
  const event: RealtimeEvent = { type, payload };
  const origin = c.var.clientId;
  if (origin !== undefined) event.origin = origin;
  await c.var.services.publisher.publish(workspaceId, event);
}

// ---------------------------------------------------------------------------
// GET /teams/:teamId/issues — list with filters
// ---------------------------------------------------------------------------

issuesRouter.get('/teams/:teamId/issues', async (c) => {
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));

  const raw: Record<string, unknown> = {};
  const q = c.req.query();
  if (q.state !== undefined) raw.state = q.state;
  if (q.assignee !== undefined) raw.assignee = q.assignee;
  if (q.priority !== undefined) raw.priority = Number(q.priority);
  if (q.label !== undefined) raw.label = q.label;
  if (q.cycle !== undefined) raw.cycle = q.cycle;
  if (q.project !== undefined) raw.project = q.project;
  if (q.q !== undefined) raw.q = q.q;
  if (q.updatedSince !== undefined) raw.updatedSince = q.updatedSince;
  const filters = parseInput(IssueListFilters, raw);

  const conditions = [eq(issue.teamId, t.id)];
  if (filters.state) conditions.push(eq(issue.stateId, filters.state));
  if (filters.assignee) conditions.push(eq(issue.assigneeId, filters.assignee));
  if (filters.priority !== undefined) {
    conditions.push(eq(issue.priority, filters.priority));
  }
  if (filters.cycle) conditions.push(eq(issue.cycleId, filters.cycle));
  if (filters.project) conditions.push(eq(issue.projectId, filters.project));
  if (filters.q) {
    const term = `%${filters.q}%`;
    const titleOrDesc = or(
      like(issue.title, term),
      like(issue.description, term),
    );
    if (titleOrDesc) conditions.push(titleOrDesc);
  }
  if (filters.updatedSince) {
    conditions.push(gt(issue.updatedAt, new Date(filters.updatedSince)));
  }

  let rows: DbIssue[];
  if (filters.label) {
    rows = (
      await db
        .select({ issue })
        .from(issue)
        .innerJoin(issueLabel, eq(issueLabel.issueId, issue.id))
        .where(and(...conditions, eq(issueLabel.labelId, filters.label)))
        .orderBy(asc(issue.sortOrder))
    ).map((r) => r.issue);
  } else {
    rows = await db
      .select()
      .from(issue)
      .where(and(...conditions))
      .orderBy(asc(issue.sortOrder));
  }

  const data = await toIssuesWithRelations(db, rows);
  return c.json({ data });
});

// ---------------------------------------------------------------------------
// POST /teams/:teamId/issues — create with atomic per-team number
// ---------------------------------------------------------------------------

issuesRouter.post('/teams/:teamId/issues', async (c) => {
  const { db } = c.var.services;
  const t = await getTeamWithAccess(c, c.req.param('teamId'));
  const input = await parseBody(c, CreateIssueInput);

  // Resolve target state.
  let stateId = input.stateId;
  if (stateId) {
    if (!(await stateBelongsToTeam(db, stateId, t.id))) {
      throw badRequest('stateId does not belong to this team', 'invalid_state');
    }
  } else {
    const fallback = await getDefaultStateId(db, t.id);
    if (!fallback) {
      throw badRequest('Team has no workflow states', 'no_states');
    }
    stateId = fallback;
  }

  // sortOrder: append to end of column unless explicitly provided.
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const last = await db
      .select({ sortOrder: issue.sortOrder })
      .from(issue)
      .where(eq(issue.teamId, t.id))
      .orderBy(desc(issue.sortOrder))
      .limit(1);
    sortOrder = sortOrderBetween(last[0]?.sortOrder, undefined);
  }

  const issueId = genId();
  const now = new Date();

  // Atomic per-team number: INSERT ... SELECT coalesce(max(number),0)+1.
  await db.run(sql`
    INSERT INTO ${issue} (
      id, team_id, number, title, description, state_id, priority,
      assignee_id, creator_id, parent_id, project_id, cycle_id, estimate,
      sort_order, due_date, created_at, updated_at, completed_at, canceled_at
    )
    SELECT
      ${issueId}, ${t.id},
      COALESCE((SELECT MAX(number) FROM ${issue} WHERE team_id = ${t.id}), 0) + 1,
      ${input.title}, ${input.description ?? null}, ${stateId},
      ${input.priority ?? 0}, ${input.assigneeId ?? null}, ${c.var.user.id},
      ${input.parentId ?? null}, ${input.projectId ?? null},
      ${input.cycleId ?? null}, ${input.estimate ?? null}, ${sortOrder},
      ${input.dueDate ? new Date(input.dueDate).getTime() : null},
      ${now.getTime()}, ${now.getTime()}, NULL, NULL
  `);

  const createdRows = await db
    .select()
    .from(issue)
    .where(eq(issue.id, issueId))
    .limit(1);
  const created = createdRows[0];
  if (!created) throw new Error('Issue insert failed');

  // Attach labels.
  const labelIds = input.labelIds ?? [];
  if (labelIds.length > 0) {
    await db
      .insert(issueLabel)
      .values(labelIds.map((labelId: string) => ({ issueId, labelId })));
  }

  // Activity: created.
  await recordActivity(db, {
    issueId,
    actorId: c.var.user.id,
    type: 'created',
  });

  // Notification: assignee (if not self).
  if (created.assigneeId) {
    await createNotification(db, {
      userId: created.assigneeId,
      workspaceId: t.workspaceId,
      issueId,
      actorId: c.var.user.id,
      type: 'assigned',
    });
  }

  const detail = await loadIssueDetail(db, created);
  await publish(c, t.workspaceId, 'issue.created', detail);
  return c.json({ data: detail }, 201);
});

// ---------------------------------------------------------------------------
// GET /issues/:id
// ---------------------------------------------------------------------------

issuesRouter.get('/issues/:id', async (c) => {
  const { db } = c.var.services;
  const { issue: i } = await getIssueWithAccess(c, c.req.param('id'));
  const detail = await loadIssueDetail(db, i);
  return c.json({ data: detail });
});

// ---------------------------------------------------------------------------
// GET /issues/by-key/:identifier — "ENG-42"
// ---------------------------------------------------------------------------

issuesRouter.get('/issues/by-key/:identifier', async (c) => {
  const { db } = c.var.services;
  const identifier = c.req.param('identifier');
  let parsed: { teamKey: string; number: number };
  try {
    parsed = parseIdentifier(identifier);
  } catch {
    throw badRequest('Invalid issue identifier', 'invalid_identifier');
  }

  const teamRows = await db
    .select()
    .from(team)
    .where(eq(team.key, parsed.teamKey));
  // Filter to teams the user can access; pick the first match by number.
  for (const t of teamRows) {
    const membership = await getMembership(db, t.workspaceId, c.var.user.id);
    if (!membership) continue;
    if (c.var.apiKeyWorkspaceId !== null && c.var.apiKeyWorkspaceId !== t.workspaceId) {
      continue;
    }
    const rows = await db
      .select()
      .from(issue)
      .where(and(eq(issue.teamId, t.id), eq(issue.number, parsed.number)))
      .limit(1);
    const found = rows[0];
    if (found) {
      const detail = await loadIssueDetail(db, found);
      return c.json({ data: detail });
    }
  }
  throw notFound('Issue not found');
});

// ---------------------------------------------------------------------------
// PATCH /issues/:id
// ---------------------------------------------------------------------------

issuesRouter.patch('/issues/:id', async (c) => {
  const { db } = c.var.services;
  const { issue: existing, team: t } = await getIssueWithAccess(
    c,
    c.req.param('id'),
  );
  const input = await parseBody(c, UpdateIssueInput);

  const patch: Partial<typeof issue.$inferInsert> = {};
  const activities: Array<{ type: string; data: unknown }> = [];
  let assigneeChangedTo: string | null | undefined;
  let stateChanged = false;

  if (input.title !== undefined && input.title !== existing.title) {
    patch.title = input.title;
    activities.push({
      type: 'title_changed',
      data: { from: existing.title, to: input.title },
    });
  }
  if (input.description !== undefined && input.description !== existing.description) {
    patch.description = input.description;
    activities.push({ type: 'description_changed', data: {} });
  }
  if (input.stateId !== undefined && input.stateId !== existing.stateId) {
    if (!(await stateBelongsToTeam(db, input.stateId, t.id))) {
      throw badRequest('stateId does not belong to this team', 'invalid_state');
    }
    patch.stateId = input.stateId;
    stateChanged = true;
    // Activity stores names captured at change time so history survives
    // later state renames/deletes.
    const stRows = await db
      .select()
      .from(workflowState)
      .where(inArray(workflowState.id, [existing.stateId, input.stateId]));
    const fromState = stRows.find((s) => s.id === existing.stateId);
    const toState = stRows.find((s) => s.id === input.stateId);
    activities.push({
      type: 'state_changed',
      data: {
        from: existing.stateId,
        to: input.stateId,
        fromName: fromState?.name,
        toName: toState?.name,
      },
    });
    // Maintain completed/canceled timestamps from the new state type.
    if (toState) {
      patch.completedAt = toState.type === 'completed' ? new Date() : null;
      patch.canceledAt = toState.type === 'canceled' ? new Date() : null;
    }
  }
  if (input.priority !== undefined && input.priority !== existing.priority) {
    patch.priority = input.priority;
    activities.push({
      type: 'priority_changed',
      data: {
        from: existing.priority,
        to: input.priority,
        fromName: priorityLabel(existing.priority),
        toName: priorityLabel(input.priority),
      },
    });
  }
  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== existing.assigneeId
  ) {
    patch.assigneeId = input.assigneeId;
    assigneeChangedTo = input.assigneeId;
    const assigneeIds = [existing.assigneeId, input.assigneeId].filter(
      (v): v is string => v != null,
    );
    const assigneeRows = assigneeIds.length
      ? await db
          .select({ id: userTable.id, name: userTable.name })
          .from(userTable)
          .where(inArray(userTable.id, assigneeIds))
      : [];
    const userName = (uid: string | null | undefined) =>
      assigneeRows.find((u) => u.id === uid)?.name;
    activities.push({
      type: 'assignee_changed',
      data: {
        from: existing.assigneeId,
        to: input.assigneeId,
        fromName: userName(existing.assigneeId),
        toName: userName(input.assigneeId),
      },
    });
  }
  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    patch.parentId = input.parentId;
  }
  if (input.projectId !== undefined && input.projectId !== existing.projectId) {
    patch.projectId = input.projectId;
    const projectIds = [existing.projectId, input.projectId].filter(
      (v): v is string => v != null,
    );
    const projectRows = projectIds.length
      ? await db
          .select({ id: projectTable.id, name: projectTable.name })
          .from(projectTable)
          .where(inArray(projectTable.id, projectIds))
      : [];
    const projectName = (pid: string | null | undefined) =>
      projectRows.find((p) => p.id === pid)?.name;
    activities.push({
      type: 'project_changed',
      data: {
        from: existing.projectId,
        to: input.projectId,
        fromName: projectName(existing.projectId),
        toName: projectName(input.projectId),
      },
    });
  }
  if (input.cycleId !== undefined && input.cycleId !== existing.cycleId) {
    patch.cycleId = input.cycleId;
    activities.push({
      type: 'cycle_changed',
      data: { from: existing.cycleId, to: input.cycleId },
    });
  }
  if (input.estimate !== undefined && input.estimate !== existing.estimate) {
    patch.estimate = input.estimate;
    activities.push({
      type: 'estimate_changed',
      data: { from: existing.estimate, to: input.estimate },
    });
  }
  if (input.sortOrder !== undefined && input.sortOrder !== existing.sortOrder) {
    patch.sortOrder = input.sortOrder;
  }
  if (input.dueDate !== undefined) {
    const newDue = input.dueDate ? new Date(input.dueDate) : null;
    const oldMs = existing.dueDate ? new Date(existing.dueDate).getTime() : null;
    const newMs = newDue ? newDue.getTime() : null;
    if (oldMs !== newMs) {
      patch.dueDate = newDue;
      activities.push({ type: 'due_date_changed', data: { to: input.dueDate } });
    }
  }

  if (Object.keys(patch).length === 0) {
    const detail = await loadIssueDetail(db, existing);
    return c.json({ data: detail });
  }

  patch.updatedAt = new Date();
  const [updated] = await db
    .update(issue)
    .set(patch)
    .where(eq(issue.id, existing.id))
    .returning();

  // Record activities.
  for (const act of activities) {
    await recordActivity(db, {
      issueId: existing.id,
      actorId: c.var.user.id,
      type: act.type,
      data: act.data,
    });
  }

  // Notifications: new assignee.
  if (assigneeChangedTo) {
    await createNotification(db, {
      userId: assigneeChangedTo,
      workspaceId: t.workspaceId,
      issueId: existing.id,
      actorId: c.var.user.id,
      type: 'assigned',
    });
  }
  // Notifications: state change → participants.
  if (stateChanged) {
    const participants = await getIssueParticipants(
      db,
      updated!,
      c.var.user.id,
    );
    for (const userId of participants) {
      await createNotification(db, {
        userId,
        workspaceId: t.workspaceId,
        issueId: existing.id,
        actorId: c.var.user.id,
        type: 'state_changed',
      });
    }
  }

  const detail = await loadIssueDetail(db, updated!);
  await publish(c, t.workspaceId, 'issue.updated', detail);
  return c.json({ data: detail });
});

// ---------------------------------------------------------------------------
// DELETE /issues/:id — orphan sub-issues (parentId → null)
// ---------------------------------------------------------------------------

issuesRouter.delete('/issues/:id', async (c) => {
  const { db } = c.var.services;
  const { issue: existing, team: t } = await getIssueWithAccess(
    c,
    c.req.param('id'),
  );

  await db
    .update(issue)
    .set({ parentId: null })
    .where(eq(issue.parentId, existing.id));
  await db.delete(issue).where(eq(issue.id, existing.id));

  await publish(c, t.workspaceId, 'issue.deleted', { id: existing.id });
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// POST /issues/:id/comments
// ---------------------------------------------------------------------------

issuesRouter.post('/issues/:id/comments', async (c) => {
  const { db } = c.var.services;
  const { issue: existing, team: t } = await getIssueWithAccess(
    c,
    c.req.param('id'),
  );
  const input = await parseBody(c, CreateCommentInput);

  const commentId = genId();
  const now = new Date();
  const [created] = await db
    .insert(comment)
    .values({
      id: commentId,
      issueId: existing.id,
      authorId: c.var.user.id,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await recordActivity(db, {
    issueId: existing.id,
    actorId: c.var.user.id,
    type: 'comment_added',
    data: { commentId },
  });

  // Notify all participants (creator, assignee, prior commenters) except actor.
  const participants = await getIssueParticipants(db, existing, c.var.user.id);
  for (const userId of participants) {
    await createNotification(db, {
      userId,
      workspaceId: t.workspaceId,
      issueId: existing.id,
      actorId: c.var.user.id,
      type: 'comment',
    });
  }

  const serialized = serializeComment(created!);
  await publish(c, t.workspaceId, 'comment.created', serialized);
  return c.json({ data: serialized }, 201);
});

// ---------------------------------------------------------------------------
// POST /issues/:id/labels  +  DELETE /issues/:id/labels/:labelId
// ---------------------------------------------------------------------------

issuesRouter.post('/issues/:id/labels', async (c) => {
  const { db } = c.var.services;
  const { issue: existing, team: t } = await getIssueWithAccess(
    c,
    c.req.param('id'),
  );
  const input = await parseBody(c, AddIssueLabelInput);

  // Label must belong to the issue's workspace.
  const labelRows = await db
    .select()
    .from(label)
    .where(eq(label.id, input.labelId))
    .limit(1);
  const l = labelRows[0];
  if (!l || l.workspaceId !== t.workspaceId) {
    throw badRequest('Label does not belong to this workspace', 'invalid_label');
  }

  const existsRows = await db
    .select({ issueId: issueLabel.issueId })
    .from(issueLabel)
    .where(
      and(
        eq(issueLabel.issueId, existing.id),
        eq(issueLabel.labelId, input.labelId),
      ),
    )
    .limit(1);
  if (existsRows.length === 0) {
    await db
      .insert(issueLabel)
      .values({ issueId: existing.id, labelId: input.labelId });
    await recordActivity(db, {
      issueId: existing.id,
      actorId: c.var.user.id,
      type: 'label_added',
      data: { labelId: input.labelId },
    });
    await publish(
      c,
      t.workspaceId,
      'issue.updated',
      await loadIssueDetail(db, existing),
    );
  }
  return c.body(null, 204);
});

issuesRouter.delete('/issues/:id/labels/:labelId', async (c) => {
  const { db } = c.var.services;
  const { issue: existing, team: t } = await getIssueWithAccess(
    c,
    c.req.param('id'),
  );
  const labelId = c.req.param('labelId');

  await db
    .delete(issueLabel)
    .where(
      and(
        eq(issueLabel.issueId, existing.id),
        eq(issueLabel.labelId, labelId),
      ),
    );
  await recordActivity(db, {
    issueId: existing.id,
    actorId: c.var.user.id,
    type: 'label_removed',
    data: { labelId },
  });

  await publish(c, t.workspaceId, 'issue.updated', await loadIssueDetail(db, existing));
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// GET /workspaces/:ws/search
// ---------------------------------------------------------------------------

issuesRouter.get('/workspaces/:ws/search', async (c) => {
  const { db } = c.var.services;
  const workspaceId = c.req.param('ws');
  await requireWorkspaceAccess(c, workspaceId);

  const q = c.req.query('q');
  if (!q || q.trim().length === 0) {
    throw badRequest('Query parameter "q" is required', 'missing_query');
  }
  const query = q.trim();

  // Teams in this workspace.
  const teams = await db
    .select()
    .from(team)
    .where(eq(team.workspaceId, workspaceId));
  const teamIds = teams.map((t) => t.id);
  if (teamIds.length === 0) {
    return c.json({ data: [] });
  }
  const teamIdSet = new Set(teamIds);

  const results: DbIssue[] = [];
  const seen = new Set<string>();

  // 1. Exact identifier match (ENG-42).
  let parsed: { teamKey: string; number: number } | null = null;
  try {
    parsed = parseIdentifier(query);
  } catch {
    parsed = null;
  }
  if (parsed) {
    const match = teams.find((t) => t.key === parsed!.teamKey);
    if (match) {
      const rows = await db
        .select()
        .from(issue)
        .where(
          and(eq(issue.teamId, match.id), eq(issue.number, parsed.number)),
        )
        .limit(1);
      for (const r of rows) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          results.push(r);
        }
      }
    }
  }

  // 2. title/description LIKE across workspace teams (cap 50 total).
  const term = `%${query}%`;
  const titleOrDesc = or(like(issue.title, term), like(issue.description, term));
  const likeRows = await db
    .select()
    .from(issue)
    .where(
      and(titleOrDesc ?? sql`1=1`, inArray(issue.teamId, teamIds)),
    )
    .orderBy(desc(issue.updatedAt))
    .limit(50);
  for (const r of likeRows) {
    if (results.length >= 50) break;
    if (!seen.has(r.id) && teamIdSet.has(r.teamId)) {
      seen.add(r.id);
      results.push(r);
    }
  }

  const data = await toIssuesWithRelations(db, results.slice(0, 50));
  return c.json({ data });
});
