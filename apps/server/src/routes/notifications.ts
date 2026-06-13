import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { notification } from '@simplekanban/db';
import { serializeNotification } from '../serialize.ts';
import { notFound } from '../errors.ts';
import type { AppEnv } from '../types.ts';

export const notificationsRouter = new Hono<AppEnv>();

/** GET /notifications?unread=1 — current user's notifications. */
notificationsRouter.get('/notifications', async (c) => {
  const { db } = c.var.services;
  const unread = c.req.query('unread');
  const wantUnread = unread === '1' || unread === 'true';

  const conditions = [eq(notification.userId, c.var.user.id)];
  if (wantUnread) conditions.push(isNull(notification.readAt));

  const rows = await db
    .select()
    .from(notification)
    .where(and(...conditions))
    .orderBy(desc(notification.createdAt))
    .limit(100);
  return c.json({ data: rows.map(serializeNotification) });
});

/** POST /notifications/:id/read */
notificationsRouter.post('/notifications/:id/read', async (c) => {
  const { db } = c.var.services;
  const id = c.req.param('id');
  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.id, id))
    .limit(1);
  const existing = rows[0];
  if (!existing || existing.userId !== c.var.user.id) {
    throw notFound('Notification not found');
  }
  if (existing.readAt === null) {
    await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(eq(notification.id, id));
  }
  return c.body(null, 204);
});

/** POST /notifications/read-all */
notificationsRouter.post('/notifications/read-all', async (c) => {
  const { db } = c.var.services;
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.userId, c.var.user.id),
        isNull(notification.readAt),
      ),
    );
  return c.body(null, 204);
});
