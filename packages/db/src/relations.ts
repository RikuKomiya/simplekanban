import { relations } from 'drizzle-orm';
import {
  account,
  apiKey,
  comment,
  cycle,
  favorite,
  issue,
  issueActivity,
  issueBlocker,
  issueLabel,
  issueUsage,
  label,
  notification,
  project,
  session,
  team,
  user,
  verification,
  workflowState,
  workspace,
  workspaceMember,
} from './schema.js';

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(workspaceMember),
  createdIssues: many(issue, { relationName: 'issueCreator' }),
  assignedIssues: many(issue, { relationName: 'issueAssignee' }),
  comments: many(comment),
  activities: many(issueActivity),
  notifications: many(notification),
  favorites: many(favorite),
  apiKeys: many(apiKey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// verification has no relations, but expose an (empty) entry for completeness.
export const verificationRelations = relations(verification, () => ({}));

export const workspaceRelations = relations(workspace, ({ many }) => ({
  members: many(workspaceMember),
  teams: many(team),
  labels: many(label),
  projects: many(project),
  notifications: many(notification),
  favorites: many(favorite),
  apiKeys: many(apiKey),
}));

export const workspaceMemberRelations = relations(
  workspaceMember,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.id],
    }),
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.id],
    }),
  }),
);

export const teamRelations = relations(team, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [team.workspaceId],
    references: [workspace.id],
  }),
  states: many(workflowState),
  issues: many(issue),
  cycles: many(cycle),
}));

export const workflowStateRelations = relations(
  workflowState,
  ({ one, many }) => ({
    team: one(team, {
      fields: [workflowState.teamId],
      references: [team.id],
    }),
    issues: many(issue),
  }),
);

export const projectRelations = relations(project, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [project.workspaceId],
    references: [workspace.id],
  }),
  lead: one(user, {
    fields: [project.leadId],
    references: [user.id],
  }),
  issues: many(issue),
}));

export const cycleRelations = relations(cycle, ({ one, many }) => ({
  team: one(team, {
    fields: [cycle.teamId],
    references: [team.id],
  }),
  issues: many(issue),
}));

export const issueRelations = relations(issue, ({ one, many }) => ({
  team: one(team, {
    fields: [issue.teamId],
    references: [team.id],
  }),
  state: one(workflowState, {
    fields: [issue.stateId],
    references: [workflowState.id],
  }),
  assignee: one(user, {
    fields: [issue.assigneeId],
    references: [user.id],
    relationName: 'issueAssignee',
  }),
  creator: one(user, {
    fields: [issue.creatorId],
    references: [user.id],
    relationName: 'issueCreator',
  }),
  parent: one(issue, {
    fields: [issue.parentId],
    references: [issue.id],
    relationName: 'issueParent',
  }),
  subIssues: many(issue, { relationName: 'issueParent' }),
  project: one(project, {
    fields: [issue.projectId],
    references: [project.id],
  }),
  cycle: one(cycle, {
    fields: [issue.cycleId],
    references: [cycle.id],
  }),
  labels: many(issueLabel),
  blockedBy: many(issueBlocker, { relationName: 'issueBlockedBy' }),
  blocks: many(issueBlocker, { relationName: 'issueBlocks' }),
  comments: many(comment),
  activities: many(issueActivity),
  notifications: many(notification),
  usage: many(issueUsage),
}));

export const issueBlockerRelations = relations(issueBlocker, ({ one }) => ({
  blockedIssue: one(issue, {
    fields: [issueBlocker.blockedIssueId],
    references: [issue.id],
    relationName: 'issueBlockedBy',
  }),
  blockerIssue: one(issue, {
    fields: [issueBlocker.blockerIssueId],
    references: [issue.id],
    relationName: 'issueBlocks',
  }),
  creator: one(user, {
    fields: [issueBlocker.createdById],
    references: [user.id],
  }),
}));

export const issueUsageRelations = relations(issueUsage, ({ one }) => ({
  issue: one(issue, {
    fields: [issueUsage.issueId],
    references: [issue.id],
  }),
}));

export const labelRelations = relations(label, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [label.workspaceId],
    references: [workspace.id],
  }),
  issues: many(issueLabel),
}));

export const issueLabelRelations = relations(issueLabel, ({ one }) => ({
  issue: one(issue, {
    fields: [issueLabel.issueId],
    references: [issue.id],
  }),
  label: one(label, {
    fields: [issueLabel.labelId],
    references: [label.id],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  issue: one(issue, {
    fields: [comment.issueId],
    references: [issue.id],
  }),
  author: one(user, {
    fields: [comment.authorId],
    references: [user.id],
  }),
}));

export const issueActivityRelations = relations(issueActivity, ({ one }) => ({
  issue: one(issue, {
    fields: [issueActivity.issueId],
    references: [issue.id],
  }),
  actor: one(user, {
    fields: [issueActivity.actorId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [notification.workspaceId],
    references: [workspace.id],
  }),
  issue: one(issue, {
    fields: [notification.issueId],
    references: [issue.id],
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
  }),
}));

export const favoriteRelations = relations(favorite, ({ one }) => ({
  user: one(user, {
    fields: [favorite.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [favorite.workspaceId],
    references: [workspace.id],
  }),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [apiKey.workspaceId],
    references: [workspace.id],
  }),
}));
