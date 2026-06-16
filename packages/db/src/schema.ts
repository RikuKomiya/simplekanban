import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

/**
 * Generate a 21-char nanoid. Used as the default for every `id` column.
 */
export function genId(): string {
  return nanoid(21);
}

/** Shared `id` column definition (text nanoid(21)). */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => genId());

/** Timestamp column stored as unix epoch milliseconds. */
const timestampMs = (name: string) => integer(name, { mode: 'timestamp_ms' });

const createdAt = () =>
  timestampMs('created_at')
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  timestampMs('updated_at')
    .notNull()
    .$defaultFn(() => new Date());

// ---------------------------------------------------------------------------
// better-auth core tables
//
// Field names follow the better-auth ^1.3 Drizzle schema convention exactly.
// better-auth maps its model fields to snake_case columns via its drizzle
// adapter; the TS property names below match the model field names it expects.
// ---------------------------------------------------------------------------

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    image: text('image'),
    createdAt: timestampMs('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)],
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestampMs('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestampMs('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_id_idx').on(table.userId),
  ],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestampMs('access_token_expires_at'),
    refreshTokenExpiresAt: timestampMs('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestampMs('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestampMs('expires_at').notNull(),
    createdAt: timestampMs('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampMs('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------

export const workspace = sqliteTable(
  'workspace',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('workspace_slug_unique').on(table.slug)],
);

export const workspaceMember = sqliteTable(
  'workspace_member',
  {
    id: id(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'member'] })
      .notNull()
      .default('member'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('workspace_member_workspace_user_unique').on(
      table.workspaceId,
      table.userId,
    ),
    index('workspace_member_user_id_idx').on(table.userId),
  ],
);

export const team = sqliteTable(
  'team',
  {
    id: id(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key: text('key').notNull(),
    color: text('color'),
    icon: text('icon'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('team_workspace_key_unique').on(table.workspaceId, table.key),
    index('team_workspace_id_idx').on(table.workspaceId),
  ],
);

export const workflowState = sqliteTable(
  'workflow_state',
  {
    id: id(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', {
      enum: ['backlog', 'unstarted', 'started', 'completed', 'canceled'],
    }).notNull(),
    color: text('color').notNull(),
    position: real('position').notNull(),
  },
  (table) => [index('workflow_state_team_id_idx').on(table.teamId)],
);

export const project = sqliteTable(
  'project',
  {
    id: id(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),
    color: text('color'),
    status: text('status', {
      enum: [
        'backlog',
        'planned',
        'started',
        'paused',
        'completed',
        'canceled',
      ],
    })
      .notNull()
      .default('backlog'),
    leadId: text('lead_id').references(() => user.id, { onDelete: 'set null' }),
    startDate: timestampMs('start_date'),
    targetDate: timestampMs('target_date'),
    sortOrder: real('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index('project_workspace_id_idx').on(table.workspaceId)],
);

export const cycle = sqliteTable(
  'cycle',
  {
    id: id(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    name: text('name'),
    startsAt: timestampMs('starts_at').notNull(),
    endsAt: timestampMs('ends_at').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('cycle_team_number_unique').on(table.teamId, table.number),
    index('cycle_team_id_idx').on(table.teamId),
  ],
);

export const issue = sqliteTable(
  'issue',
  {
    id: id(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    stateId: text('state_id')
      .notNull()
      .references(() => workflowState.id, { onDelete: 'restrict' }),
    priority: integer('priority').notNull().default(0),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    creatorId: text('creator_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    parentId: text('parent_id'),
    projectId: text('project_id').references(() => project.id, {
      onDelete: 'set null',
    }),
    cycleId: text('cycle_id').references(() => cycle.id, {
      onDelete: 'set null',
    }),
    estimate: integer('estimate'),
    sortOrder: real('sort_order').notNull().default(0),
    dueDate: timestampMs('due_date'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestampMs('completed_at'),
    canceledAt: timestampMs('canceled_at'),
  },
  (table) => [
    uniqueIndex('issue_team_number_unique').on(table.teamId, table.number),
    index('issue_team_id_idx').on(table.teamId),
    index('issue_state_id_idx').on(table.stateId),
    index('issue_assignee_id_idx').on(table.assigneeId),
    index('issue_parent_id_idx').on(table.parentId),
    index('issue_project_id_idx').on(table.projectId),
    index('issue_cycle_id_idx').on(table.cycleId),
  ],
);

export const label = sqliteTable(
  'label',
  {
    id: id(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
  },
  (table) => [index('label_workspace_id_idx').on(table.workspaceId)],
);

export const issueLabel = sqliteTable(
  'issue_label',
  {
    issueId: text('issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => label.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    index('issue_label_label_id_idx').on(table.labelId),
  ],
);

export const issueBlocker = sqliteTable(
  'issue_blocker',
  {
    blockedIssueId: text('blocked_issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    blockerIssueId: text('blocker_issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.blockedIssueId, table.blockerIssueId] }),
    index('issue_blocker_blocked_issue_id_idx').on(table.blockedIssueId),
    index('issue_blocker_blocker_issue_id_idx').on(table.blockerIssueId),
  ],
);

export const issueUsage = sqliteTable('issue_usage', {
  issueId: text('issue_id')
    .primaryKey()
    .references(() => issue.id, { onDelete: 'cascade' }),
  tokens: integer('tokens').notNull().default(0),
  updatedAt: updatedAt(),
});

export const comment = sqliteTable(
  'comment',
  {
    id: id(),
    issueId: text('issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('comment_issue_id_idx').on(table.issueId)],
);

export const issueActivity = sqliteTable(
  'issue_activity',
  {
    id: id(),
    issueId: text('issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    data: text('data'),
    createdAt: createdAt(),
  },
  (table) => [index('issue_activity_issue_id_idx').on(table.issueId)],
);

export const notification = sqliteTable(
  'notification',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    issueId: text('issue_id').references(() => issue.id, {
      onDelete: 'cascade',
    }),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    type: text('type', {
      enum: ['assigned', 'comment', 'state_changed', 'mention'],
    }).notNull(),
    readAt: timestampMs('read_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('notification_user_id_idx').on(table.userId),
    index('notification_workspace_id_idx').on(table.workspaceId),
  ],
);

export const favorite = sqliteTable(
  'favorite',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    entityType: text('entity_type', {
      enum: ['issue', 'project', 'cycle', 'view'],
    }).notNull(),
    entityId: text('entity_id').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('favorite_user_entity_unique').on(
      table.userId,
      table.entityType,
      table.entityId,
    ),
    index('favorite_user_id_idx').on(table.userId),
  ],
);

export const apiKey = sqliteTable(
  'api_key',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    hashedKey: text('hashed_key').notNull(),
    prefix: text('prefix').notNull(),
    scopes: text('scopes').notNull().default('*'),
    lastUsedAt: timestampMs('last_used_at'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('api_key_hashed_key_unique').on(table.hashedKey),
    index('api_key_user_id_idx').on(table.userId),
    index('api_key_workspace_id_idx').on(table.workspaceId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred row types (select / insert)
// ---------------------------------------------------------------------------

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
export type WorkspaceMember = typeof workspaceMember.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMember.$inferInsert;
export type Team = typeof team.$inferSelect;
export type NewTeam = typeof team.$inferInsert;
export type WorkflowState = typeof workflowState.$inferSelect;
export type NewWorkflowState = typeof workflowState.$inferInsert;
export type Issue = typeof issue.$inferSelect;
export type NewIssue = typeof issue.$inferInsert;
export type Label = typeof label.$inferSelect;
export type NewLabel = typeof label.$inferInsert;
export type IssueLabel = typeof issueLabel.$inferSelect;
export type NewIssueLabel = typeof issueLabel.$inferInsert;
export type IssueBlocker = typeof issueBlocker.$inferSelect;
export type NewIssueBlocker = typeof issueBlocker.$inferInsert;
export type IssueUsage = typeof issueUsage.$inferSelect;
export type NewIssueUsage = typeof issueUsage.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type Cycle = typeof cycle.$inferSelect;
export type NewCycle = typeof cycle.$inferInsert;
export type Comment = typeof comment.$inferSelect;
export type NewComment = typeof comment.$inferInsert;
export type IssueActivity = typeof issueActivity.$inferSelect;
export type NewIssueActivity = typeof issueActivity.$inferInsert;
export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;
export type Favorite = typeof favorite.$inferSelect;
export type NewFavorite = typeof favorite.$inferInsert;
export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;

// Re-export for drizzle-kit raw SQL helpers if needed elsewhere.
export { sql };
