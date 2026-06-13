import { and, eq, ne } from 'drizzle-orm';
import {
  comment,
  genId,
  issueActivity,
  notification,
  type Database,
  type Issue as DbIssue,
  type NewIssueActivity,
  type NewNotification,
} from '@simplekanban/db';
import type { NotificationType } from '@simplekanban/shared';

/** Record one issueActivity row. */
export async function recordActivity(
  db: Database,
  input: {
    issueId: string;
    actorId: string;
    type: string;
    data?: unknown;
  },
): Promise<void> {
  const row: NewIssueActivity = {
    id: genId(),
    issueId: input.issueId,
    actorId: input.actorId,
    type: input.type,
    data: input.data === undefined ? null : JSON.stringify(input.data),
    createdAt: new Date(),
  };
  await db.insert(issueActivity).values(row);
}

/**
 * Create a notification for `userId`. No-op when the recipient is the actor
 * (never notify yourself).
 */
export async function createNotification(
  db: Database,
  input: {
    userId: string;
    workspaceId: string;
    issueId: string | null;
    actorId: string;
    type: NotificationType;
  },
): Promise<void> {
  if (input.userId === input.actorId) return;
  const row: NewNotification = {
    id: genId(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    issueId: input.issueId,
    actorId: input.actorId,
    type: input.type,
    readAt: null,
    createdAt: new Date(),
  };
  await db.insert(notification).values(row);
}

/**
 * Collect the distinct set of user ids "involved" with an issue: its creator,
 * current assignee, and every distinct comment author. Used to fan out comment
 * notifications. Excludes `exclude` (the actor).
 */
export async function getIssueParticipants(
  db: Database,
  issue: DbIssue,
  exclude: string,
): Promise<string[]> {
  const ids = new Set<string>();
  ids.add(issue.creatorId);
  if (issue.assigneeId) ids.add(issue.assigneeId);

  const commenters = await db
    .selectDistinct({ authorId: comment.authorId })
    .from(comment)
    .where(
      and(eq(comment.issueId, issue.id), ne(comment.authorId, exclude)),
    );
  for (const row of commenters) {
    ids.add(row.authorId);
  }

  ids.delete(exclude);
  return [...ids];
}
