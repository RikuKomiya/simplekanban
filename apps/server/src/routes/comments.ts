import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { comment } from '@simplekanban/db';
import { UpdateCommentInput } from '@simplekanban/shared';
import { getCommentWithAccess } from '../access.ts';
import { forbidden } from '../errors.ts';
import { serializeComment } from '../serialize.ts';
import { parseBody } from '../validate.ts';
import type { AppEnv } from '../types.ts';
import type { RealtimeEvent } from '@simplekanban/shared';

export const commentsRouter = new Hono<AppEnv>();

/** PATCH /comments/:id — author only. */
commentsRouter.patch('/comments/:id', async (c) => {
  const { db, publisher } = c.var.services;
  const { comment: existing, team: t } = await getCommentWithAccess(
    c,
    c.req.param('id'),
  );
  if (existing.authorId !== c.var.user.id) {
    throw forbidden('Only the author can edit this comment');
  }
  const input = await parseBody(c, UpdateCommentInput);

  const [updated] = await db
    .update(comment)
    .set({ body: input.body, updatedAt: new Date() })
    .where(eq(comment.id, existing.id))
    .returning();

  const serialized = serializeComment(updated!);
  const event: RealtimeEvent = {
    type: 'comment.updated',
    payload: serialized,
  };
  if (c.var.clientId !== undefined) event.origin = c.var.clientId;
  await publisher.publish(t.workspaceId, event);
  return c.json({ data: serialized });
});

/** DELETE /comments/:id — author only. */
commentsRouter.delete('/comments/:id', async (c) => {
  const { db, publisher } = c.var.services;
  const { comment: existing, team: t } = await getCommentWithAccess(
    c,
    c.req.param('id'),
  );
  if (existing.authorId !== c.var.user.id) {
    throw forbidden('Only the author can delete this comment');
  }
  await db.delete(comment).where(eq(comment.id, existing.id));

  const event: RealtimeEvent = {
    type: 'comment.deleted',
    payload: { id: existing.id, issueId: existing.issueId },
  };
  if (c.var.clientId !== undefined) event.origin = c.var.clientId;
  await publisher.publish(t.workspaceId, event);
  return c.body(null, 204);
});
