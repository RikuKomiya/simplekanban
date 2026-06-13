import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  comment,
  issue,
  issueActivity,
  issueLabel,
  label,
  user as userTable,
  workflowState,
  type Database,
  type Issue as DbIssue,
  type Label as DbLabel,
  type User as DbUser,
} from '@simplekanban/db';
import type {
  IssueDetail,
  IssueWithRelations,
} from '@simplekanban/shared';
import {
  serializeActivityWithActor,
  serializeCommentWithAuthor,
  serializeIssue,
  serializeLabel,
  serializeUserSummary,
  serializeWorkflowState,
} from './serialize.ts';

/** Load the labels attached to a single issue. */
export async function loadIssueLabels(
  db: Database,
  issueId: string,
): Promise<DbLabel[]> {
  const rows = await db
    .select({ label })
    .from(issueLabel)
    .innerJoin(label, eq(issueLabel.labelId, label.id))
    .where(eq(issueLabel.issueId, issueId));
  return rows.map((r) => r.label);
}

/**
 * Build `IssueWithRelations` (issue + labels + assignee) for a set of issues in
 * a few batched queries (avoids N+1 across a board/list response).
 */
export async function toIssuesWithRelations(
  db: Database,
  issues: DbIssue[],
): Promise<IssueWithRelations[]> {
  if (issues.length === 0) return [];
  const issueIds = issues.map((i) => i.id);

  // Labels per issue.
  const labelRows = await db
    .select({ issueId: issueLabel.issueId, label })
    .from(issueLabel)
    .innerJoin(label, eq(issueLabel.labelId, label.id))
    .where(inArray(issueLabel.issueId, issueIds));
  const labelsByIssue = new Map<string, DbLabel[]>();
  for (const row of labelRows) {
    const list = labelsByIssue.get(row.issueId) ?? [];
    list.push(row.label);
    labelsByIssue.set(row.issueId, list);
  }

  // Assignees.
  const assigneeIds = [
    ...new Set(
      issues
        .map((i) => i.assigneeId)
        .filter((v): v is string => v !== null && v !== undefined),
    ),
  ];
  const usersById = await loadUsersById(db, assigneeIds);

  return issues.map((i) => {
    const assignee =
      i.assigneeId && usersById.get(i.assigneeId)
        ? serializeUserSummary(usersById.get(i.assigneeId)!)
        : null;
    return {
      ...serializeIssue(i),
      labels: (labelsByIssue.get(i.id) ?? []).map(serializeLabel),
      assignee,
    };
  });
}

/** Single-issue convenience wrapper around {@link toIssuesWithRelations}. */
export async function toIssueWithRelations(
  db: Database,
  i: DbIssue,
): Promise<IssueWithRelations> {
  const [result] = await toIssuesWithRelations(db, [i]);
  return result!;
}

/** Load a map of user id → user row for the given ids. */
export async function loadUsersById(
  db: Database,
  ids: string[],
): Promise<Map<string, DbUser>> {
  const map = new Map<string, DbUser>();
  if (ids.length === 0) return map;
  const rows = await db
    .select()
    .from(userTable)
    .where(inArray(userTable.id, ids));
  for (const u of rows) map.set(u.id, u);
  return map;
}

/**
 * Build the full `IssueDetail` payload: labels, assignee, creator, state,
 * comments (with authors), activities (with actors), and sub-issues.
 */
export async function loadIssueDetail(
  db: Database,
  i: DbIssue,
): Promise<IssueDetail> {
  const labels = await loadIssueLabels(db, i.id);

  const stateRows = await db
    .select()
    .from(workflowState)
    .where(eq(workflowState.id, i.stateId))
    .limit(1);
  const state = stateRows[0]!;

  const commentRows = await db
    .select()
    .from(comment)
    .where(eq(comment.issueId, i.id))
    .orderBy(asc(comment.createdAt));

  const activityRows = await db
    .select()
    .from(issueActivity)
    .where(eq(issueActivity.issueId, i.id))
    .orderBy(asc(issueActivity.createdAt));

  const subIssueRows = await db
    .select()
    .from(issue)
    .where(eq(issue.parentId, i.id))
    .orderBy(asc(issue.sortOrder));

  // Gather every user referenced (creator, assignee, comment authors, actors).
  const userIds = new Set<string>();
  userIds.add(i.creatorId);
  if (i.assigneeId) userIds.add(i.assigneeId);
  for (const cm of commentRows) userIds.add(cm.authorId);
  for (const act of activityRows) userIds.add(act.actorId);
  const usersById = await loadUsersById(db, [...userIds]);

  const creator = usersById.get(i.creatorId)!;
  const assignee =
    i.assigneeId && usersById.get(i.assigneeId)
      ? serializeUserSummary(usersById.get(i.assigneeId)!)
      : null;

  return {
    ...serializeIssue(i),
    labels: labels.map(serializeLabel),
    assignee,
    creator: serializeUserSummary(creator),
    state: serializeWorkflowState(state),
    comments: commentRows.map((cm) =>
      serializeCommentWithAuthor(cm, usersById.get(cm.authorId)!),
    ),
    activities: activityRows.map((act) =>
      serializeActivityWithActor(act, usersById.get(act.actorId)!),
    ),
    subIssues: subIssueRows.map(serializeIssue),
  };
}

/** Resolve the default initial workflow state for a team (lowest position). */
export async function getDefaultStateId(
  db: Database,
  teamId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(workflowState)
    .where(eq(workflowState.teamId, teamId))
    .orderBy(asc(workflowState.position))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Validate that a state belongs to a team. */
export async function stateBelongsToTeam(
  db: Database,
  stateId: string,
  teamId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: workflowState.id })
    .from(workflowState)
    .where(
      and(eq(workflowState.id, stateId), eq(workflowState.teamId, teamId)),
    )
    .limit(1);
  return rows.length > 0;
}
