/**
 * Issue priority levels.
 * 0 = none, 1 = urgent, 2 = high, 3 = medium, 4 = low (per architecture contract).
 */
export const Priority = {
  None: 0,
  Urgent: 1,
  High: 2,
  Medium: 3,
  Low: 4,
} as const;

export type PriorityValue = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_VALUES = [0, 1, 2, 3, 4] as const;

/** Display labels indexed by priority value. */
export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

/** Slug-ish keys used by the CLI / API for fuzzy resolution. */
export const PRIORITY_KEYS: Record<PriorityValue, string> = {
  0: 'none',
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
};

/**
 * Canonical display order for priorities (urgent first, none last) — used by
 * UI sorting where "no priority" sinks to the bottom.
 */
export const PRIORITY_ORDER: readonly PriorityValue[] = [1, 2, 3, 4, 0];

/** Workflow state categories. */
export const STATE_TYPES = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'canceled',
] as const;

export type StateType = (typeof STATE_TYPES)[number];

/** Project lifecycle statuses. */
export const PROJECT_STATUSES = [
  'backlog',
  'planned',
  'started',
  'paused',
  'completed',
  'canceled',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Workspace member roles. */
export const WORKSPACE_ROLES = ['admin', 'member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** issueActivity.type values (open-ended set; common ones enumerated). */
export const ACTIVITY_TYPES = [
  'created',
  'state_changed',
  'assignee_changed',
  'priority_changed',
  'title_changed',
  'description_changed',
  'label_added',
  'label_removed',
  'comment_added',
  'estimate_changed',
  'due_date_changed',
  'project_changed',
  'cycle_changed',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** notification.type values. */
export const NOTIFICATION_TYPES = [
  'assigned',
  'comment',
  'state_changed',
  'mention',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** favorite.entityType values. */
export const FAVORITE_ENTITY_TYPES = [
  'issue',
  'project',
  'cycle',
  'view',
] as const;

export type FavoriteEntityType = (typeof FAVORITE_ENTITY_TYPES)[number];

/** API key permission scopes. `*` preserves the legacy full-access behavior. */
export const API_KEY_SCOPES = [
  '*',
  'issues:read',
  'issues:write',
  'comments:read',
  'comments:write',
  'states:read',
  'states:write',
  'members:read',
  'members:write',
  'relations:read',
  'relations:write',
  'usage:write',
  'api_keys:write',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** API-key plaintext prefix. */
export const API_KEY_PREFIX = 'sk_';
