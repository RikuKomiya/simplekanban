import { z } from 'zod';

/**
 * Realtime event types broadcast by the workspace Durable Object.
 * `*` wildcard variants in the architecture doc (project.* / cycle.* / ...) are
 * enumerated explicitly here so consumers get exhaustive typing.
 */
export const REALTIME_EVENT_TYPES = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'comment.created',
  'comment.updated',
  'comment.deleted',
  'project.created',
  'project.updated',
  'project.deleted',
  'cycle.created',
  'cycle.updated',
  'cycle.deleted',
  'label.created',
  'label.updated',
  'label.deleted',
  'state.created',
  'state.updated',
  'state.deleted',
  'notification.created',
] as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];

export const RealtimeEventTypeSchema = z.enum(REALTIME_EVENT_TYPES);

/**
 * Realtime event envelope.
 * - `type`: discriminator from {@link REALTIME_EVENT_TYPES}
 * - `payload`: serialized entity JSON (shape depends on `type`)
 * - `origin`: optional client id of the mutation author, used to suppress
 *   echo back to the originating client.
 */
export const RealtimeEventSchema = z.object({
  type: RealtimeEventTypeSchema,
  payload: z.unknown(),
  origin: z.string().optional(),
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
