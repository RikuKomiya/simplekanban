import { z } from 'zod';
import {
  FAVORITE_ENTITY_TYPES,
  API_KEY_SCOPES,
  NOTIFICATION_TYPES,
  PROJECT_STATUSES,
  STATE_TYPES,
  WORKSPACE_ROLES,
} from './constants.js';

/**
 * All entity schemas describe the API *serialize* shape:
 * `Date` columns are emitted as ISO-8601 strings.
 */

const isoDateString = z.string().datetime({ offset: true });
const idString = z.string().min(1);
const priorityValue = z.number().int().min(0).max(4);

// ---------------------------------------------------------------------------
// Auth-adjacent / user
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: idString,
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type User = z.infer<typeof UserSchema>;

/** Trimmed user shape embedded in other entities (assignee, author, ...). */
export const UserSummarySchema = z.object({
  id: idString,
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

// ---------------------------------------------------------------------------
// Workspace / members
// ---------------------------------------------------------------------------

export const WorkspaceSchema = z.object({
  id: idString,
  name: z.string(),
  slug: z.string(),
  createdAt: isoDateString,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  id: idString,
  workspaceId: idString,
  userId: idString,
  role: z.enum(WORKSPACE_ROLES),
  createdAt: isoDateString,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceMemberWithUserSchema = WorkspaceMemberSchema.extend({
  user: UserSummarySchema,
});
export type WorkspaceMemberWithUser = z.infer<
  typeof WorkspaceMemberWithUserSchema
>;

// ---------------------------------------------------------------------------
// Team / workflow states
// ---------------------------------------------------------------------------

export const TeamSchema = z.object({
  id: idString,
  workspaceId: idString,
  name: z.string(),
  key: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: isoDateString,
});
export type Team = z.infer<typeof TeamSchema>;

export const WorkflowStateSchema = z.object({
  id: idString,
  teamId: idString,
  name: z.string(),
  type: z.enum(STATE_TYPES),
  color: z.string(),
  position: z.number(),
});
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export const LabelSchema = z.object({
  id: idString,
  workspaceId: idString,
  name: z.string(),
  color: z.string(),
});
export type Label = z.infer<typeof LabelSchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
  id: idString,
  workspaceId: idString,
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  status: z.enum(PROJECT_STATUSES),
  leadId: idString.nullable(),
  startDate: isoDateString.nullable(),
  targetDate: isoDateString.nullable(),
  sortOrder: z.number(),
  createdAt: isoDateString,
});
export type Project = z.infer<typeof ProjectSchema>;

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

export const CycleSchema = z.object({
  id: idString,
  teamId: idString,
  number: z.number().int(),
  name: z.string().nullable(),
  startsAt: isoDateString,
  endsAt: isoDateString,
  createdAt: isoDateString,
});
export type Cycle = z.infer<typeof CycleSchema>;

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

export const IssueSchema = z.object({
  id: idString,
  teamId: idString,
  number: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  stateId: idString,
  priority: priorityValue,
  assigneeId: idString.nullable(),
  creatorId: idString,
  parentId: idString.nullable(),
  projectId: idString.nullable(),
  cycleId: idString.nullable(),
  estimate: z.number().int().nullable(),
  sortOrder: z.number(),
  dueDate: isoDateString.nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  completedAt: isoDateString.nullable(),
  canceledAt: isoDateString.nullable(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const IssueBlockerRefSchema = z.object({
  id: idString,
  identifier: z.string(),
  teamKey: z.string(),
  number: z.number().int(),
  title: z.string(),
  state: WorkflowStateSchema,
  stateName: z.string(),
});
export type IssueBlockerRef = z.infer<typeof IssueBlockerRefSchema>;

export const IssueUsageSchema = z.object({
  issueId: idString,
  tokens: z.number().int().min(0),
  updatedAt: isoDateString,
});
export type IssueUsage = z.infer<typeof IssueUsageSchema>;

// ---------------------------------------------------------------------------
// Comment / activity
// ---------------------------------------------------------------------------

export const CommentSchema = z.object({
  id: idString,
  issueId: idString,
  authorId: idString,
  body: z.string(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});
export type Comment = z.infer<typeof CommentSchema>;

export const CommentWithAuthorSchema = CommentSchema.extend({
  author: UserSummarySchema,
});
export type CommentWithAuthor = z.infer<typeof CommentWithAuthorSchema>;

export const IssueActivitySchema = z.object({
  id: idString,
  issueId: idString,
  actorId: idString,
  type: z.string(),
  data: z.string().nullable(),
  createdAt: isoDateString,
});
export type IssueActivity = z.infer<typeof IssueActivitySchema>;

export const IssueActivityWithActorSchema = IssueActivitySchema.extend({
  actor: UserSummarySchema,
});
export type IssueActivityWithActor = z.infer<
  typeof IssueActivityWithActorSchema
>;

// ---------------------------------------------------------------------------
// Notification / favorite / api-key
// ---------------------------------------------------------------------------

export const NotificationSchema = z.object({
  id: idString,
  userId: idString,
  workspaceId: idString,
  issueId: idString.nullable(),
  actorId: idString.nullable(),
  type: z.enum(NOTIFICATION_TYPES),
  readAt: isoDateString.nullable(),
  createdAt: isoDateString,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const FavoriteSchema = z.object({
  id: idString,
  userId: idString,
  workspaceId: idString,
  entityType: z.enum(FAVORITE_ENTITY_TYPES),
  entityId: idString,
  createdAt: isoDateString,
});
export type Favorite = z.infer<typeof FavoriteSchema>;

/** API key as returned in lists — never includes the plaintext key. */
export const ApiKeySchema = z.object({
  id: idString,
  userId: idString,
  workspaceId: idString,
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.enum(API_KEY_SCOPES)),
  lastUsedAt: isoDateString.nullable(),
  createdAt: isoDateString,
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

/** API key creation response — the only time the plaintext `key` is returned. */
export const ApiKeyWithSecretSchema = ApiKeySchema.extend({
  key: z.string(),
});
export type ApiKeyWithSecret = z.infer<typeof ApiKeyWithSecretSchema>;

// ---------------------------------------------------------------------------
// Composed "with relations" shapes
// ---------------------------------------------------------------------------

/** Issue plus its labels and assignee summary (list/board row). */
export const IssueWithRelationsSchema = IssueSchema.extend({
  labels: z.array(LabelSchema),
  assignee: UserSummarySchema.nullable(),
  blockedBy: z.array(IssueBlockerRefSchema),
});
export type IssueWithRelations = z.infer<typeof IssueWithRelationsSchema>;

/** Full issue detail payload (GET /issues/:id). */
export const IssueDetailSchema = IssueSchema.extend({
  labels: z.array(LabelSchema),
  assignee: UserSummarySchema.nullable(),
  blockedBy: z.array(IssueBlockerRefSchema),
  creator: UserSummarySchema,
  state: WorkflowStateSchema,
  comments: z.array(CommentWithAuthorSchema),
  activities: z.array(IssueActivityWithActorSchema),
  subIssues: z.array(IssueSchema),
});
export type IssueDetail = z.infer<typeof IssueDetailSchema>;

/** Workspace detail payload (GET /workspaces/:ws). */
export const WorkspaceDetailSchema = WorkspaceSchema.extend({
  teams: z.array(TeamSchema),
  members: z.array(WorkspaceMemberWithUserSchema),
  labels: z.array(LabelSchema),
});
export type WorkspaceDetail = z.infer<typeof WorkspaceDetailSchema>;

/** GET /me response. */
export const MeSchema = z.object({
  user: UserSchema,
  workspaces: z.array(WorkspaceSchema),
});
export type Me = z.infer<typeof MeSchema>;

// ---------------------------------------------------------------------------
// Envelope shapes
// ---------------------------------------------------------------------------

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export function dataEnvelope<T extends z.ZodTypeAny>(inner: T) {
  return z.object({ data: inner });
}
