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
 * Create / update input schemas. The server imports these directly to validate
 * request bodies; the API client uses them to type method arguments.
 */

const idString = z.string().min(1);
const priorityValue = z.number().int().min(0).max(4);
// Accept ISO strings for date inputs over the wire.
const isoDateInput = z.string().datetime({ offset: true });

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export const CreateWorkspaceInput = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const InviteMemberInput = z.object({
  email: z.string().email(),
  role: z.enum(WORKSPACE_ROLES).optional(),
});
export type InviteMemberInput = z.infer<typeof InviteMemberInput>;

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export const CreateTeamInput = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .min(1)
    .max(6)
    .regex(/^[A-Z0-9]+$/, 'key must be uppercase alphanumeric'),
  color: z.string().optional(),
  icon: z.string().optional(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInput>;

export const UpdateTeamInput = z
  .object({
    name: z.string().min(1),
    key: z
      .string()
      .min(1)
      .max(6)
      .regex(/^[A-Z0-9]+$/),
    color: z.string().nullable(),
    icon: z.string().nullable(),
  })
  .partial();
export type UpdateTeamInput = z.infer<typeof UpdateTeamInput>;

// ---------------------------------------------------------------------------
// Workflow state
// ---------------------------------------------------------------------------

export const CreateStateInput = z.object({
  name: z.string().min(1),
  type: z.enum(STATE_TYPES),
  color: z.string().min(1),
  position: z.number().optional(),
});
export type CreateStateInput = z.infer<typeof CreateStateInput>;

export const UpdateStateInput = z
  .object({
    name: z.string().min(1),
    type: z.enum(STATE_TYPES),
    color: z.string().min(1),
    position: z.number(),
  })
  .partial();
export type UpdateStateInput = z.infer<typeof UpdateStateInput>;

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

export const CreateIssueInput = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  stateId: idString.optional(),
  priority: priorityValue.optional(),
  assigneeId: idString.nullable().optional(),
  labelIds: z.array(idString).optional(),
  parentId: idString.nullable().optional(),
  projectId: idString.nullable().optional(),
  cycleId: idString.nullable().optional(),
  estimate: z.number().int().nullable().optional(),
  sortOrder: z.number().optional(),
  dueDate: isoDateInput.nullable().optional(),
});
export type CreateIssueInput = z.infer<typeof CreateIssueInput>;

export const UpdateIssueInput = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable(),
    stateId: idString,
    priority: priorityValue,
    assigneeId: idString.nullable(),
    parentId: idString.nullable(),
    projectId: idString.nullable(),
    cycleId: idString.nullable(),
    estimate: z.number().int().nullable(),
    sortOrder: z.number(),
    dueDate: isoDateInput.nullable(),
  })
  .partial();
export type UpdateIssueInput = z.infer<typeof UpdateIssueInput>;

/** Filters for GET /teams/:teamId/issues. */
export const IssueListFilters = z
  .object({
    state: idString,
    assignee: idString,
    priority: priorityValue,
    label: idString,
    cycle: idString,
    project: idString,
    q: z.string(),
    updatedSince: isoDateInput,
    limit: z.number().int().min(1).max(200),
    cursor: z.string().min(1),
  })
  .partial();
export type IssueListFilters = z.infer<typeof IssueListFilters>;

export const IssueBatchInput = z.object({
  ids: z.array(idString).max(200),
});
export type IssueBatchInput = z.infer<typeof IssueBatchInput>;

export const AddIssueBlockerInput = z.object({
  blockerIssueId: idString,
});
export type AddIssueBlockerInput = z.infer<typeof AddIssueBlockerInput>;

export const AddIssueUsageInput = z.object({
  tokens: z.number().int().positive(),
});
export type AddIssueUsageInput = z.infer<typeof AddIssueUsageInput>;

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------

export const CreateCommentInput = z.object({
  body: z.string().min(1),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const UpdateCommentInput = z.object({
  body: z.string().min(1),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentInput>;

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export const CreateLabelInput = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
});
export type CreateLabelInput = z.infer<typeof CreateLabelInput>;

export const UpdateLabelInput = z
  .object({
    name: z.string().min(1),
    color: z.string().min(1),
  })
  .partial();
export type UpdateLabelInput = z.infer<typeof UpdateLabelInput>;

export const AddIssueLabelInput = z.object({
  labelId: idString,
});
export type AddIssueLabelInput = z.infer<typeof AddIssueLabelInput>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const CreateProjectInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  leadId: idString.nullable().optional(),
  startDate: isoDateInput.nullable().optional(),
  targetDate: isoDateInput.nullable().optional(),
  sortOrder: z.number().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable(),
    icon: z.string().nullable(),
    color: z.string().nullable(),
    status: z.enum(PROJECT_STATUSES),
    leadId: idString.nullable(),
    startDate: isoDateInput.nullable(),
    targetDate: isoDateInput.nullable(),
    sortOrder: z.number(),
  })
  .partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

export const CreateCycleInput = z.object({
  name: z.string().nullable().optional(),
  startsAt: isoDateInput,
  endsAt: isoDateInput,
});
export type CreateCycleInput = z.infer<typeof CreateCycleInput>;

export const UpdateCycleInput = z
  .object({
    name: z.string().nullable(),
    startsAt: isoDateInput,
    endsAt: isoDateInput,
  })
  .partial();
export type UpdateCycleInput = z.infer<typeof UpdateCycleInput>;

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const NotificationListFilters = z
  .object({
    unread: z.boolean(),
  })
  .partial();
export type NotificationListFilters = z.infer<typeof NotificationListFilters>;

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------

export const CreateApiKeyInput = z.object({
  name: z.string().min(1),
  scopes: z.array(z.enum(API_KEY_SCOPES)).optional(),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInput>;

// ---------------------------------------------------------------------------
// Favorite
// ---------------------------------------------------------------------------

export const CreateFavoriteInput = z.object({
  entityType: z.enum(FAVORITE_ENTITY_TYPES),
  entityId: idString,
});
export type CreateFavoriteInput = z.infer<typeof CreateFavoriteInput>;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const SearchQuery = z.object({
  q: z.string().min(1),
});
export type SearchQuery = z.infer<typeof SearchQuery>;

/** Re-export to keep notification type list accessible to validators. */
export { NOTIFICATION_TYPES };
