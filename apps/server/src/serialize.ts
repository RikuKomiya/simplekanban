import type {
  ApiKey as DbApiKey,
  Comment as DbComment,
  Cycle as DbCycle,
  Issue as DbIssue,
  IssueActivity as DbIssueActivity,
  Label as DbLabel,
  Notification as DbNotification,
  Project as DbProject,
  Team as DbTeam,
  User as DbUser,
  WorkflowState as DbWorkflowState,
  Workspace as DbWorkspace,
  WorkspaceMember as DbWorkspaceMember,
} from '@simplekanban/db';
import type {
  ApiKey,
  Comment,
  CommentWithAuthor,
  Cycle,
  Issue,
  IssueActivityWithActor,
  IssueBlockerRef,
  IssueUsage,
  Label,
  Notification,
  Project,
  Team,
  User,
  UserSummary,
  WorkflowState,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberWithUser,
} from '@simplekanban/shared';
import { API_KEY_SCOPES, type ApiKeyScope } from '@simplekanban/shared';

/** Convert a Date (or null) into an ISO-8601 string (or null). */
function iso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** Convert a non-null Date into an ISO-8601 string. */
function isoRequired(value: Date): string {
  return new Date(value).toISOString();
}

export function serializeUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image ?? null,
    createdAt: isoRequired(u.createdAt),
    updatedAt: isoRequired(u.updatedAt),
  };
}

export function serializeUserSummary(u: DbUser): UserSummary {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
  };
}

export function serializeWorkspace(w: DbWorkspace): Workspace {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    createdAt: isoRequired(w.createdAt),
  };
}

export function serializeWorkspaceMember(
  m: DbWorkspaceMember,
): WorkspaceMember {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
    createdAt: isoRequired(m.createdAt),
  };
}

export function serializeWorkspaceMemberWithUser(
  m: DbWorkspaceMember,
  u: DbUser,
): WorkspaceMemberWithUser {
  return {
    ...serializeWorkspaceMember(m),
    user: serializeUserSummary(u),
  };
}

export function serializeTeam(t: DbTeam): Team {
  return {
    id: t.id,
    workspaceId: t.workspaceId,
    name: t.name,
    key: t.key,
    color: t.color ?? null,
    icon: t.icon ?? null,
    createdAt: isoRequired(t.createdAt),
  };
}

export function serializeWorkflowState(s: DbWorkflowState): WorkflowState {
  return {
    id: s.id,
    teamId: s.teamId,
    name: s.name,
    type: s.type,
    color: s.color,
    position: s.position,
  };
}

export function serializeLabel(l: DbLabel): Label {
  return {
    id: l.id,
    workspaceId: l.workspaceId,
    name: l.name,
    color: l.color,
  };
}

export function serializeProject(p: DbProject): Project {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    description: p.description ?? null,
    icon: p.icon ?? null,
    color: p.color ?? null,
    status: p.status,
    leadId: p.leadId ?? null,
    startDate: iso(p.startDate),
    targetDate: iso(p.targetDate),
    sortOrder: p.sortOrder,
    createdAt: isoRequired(p.createdAt),
  };
}

export function serializeCycle(c: DbCycle): Cycle {
  return {
    id: c.id,
    teamId: c.teamId,
    number: c.number,
    name: c.name ?? null,
    startsAt: isoRequired(c.startsAt),
    endsAt: isoRequired(c.endsAt),
    createdAt: isoRequired(c.createdAt),
  };
}

export function serializeIssue(i: DbIssue): Issue {
  return {
    id: i.id,
    teamId: i.teamId,
    number: i.number,
    title: i.title,
    description: i.description ?? null,
    stateId: i.stateId,
    priority: i.priority,
    assigneeId: i.assigneeId ?? null,
    creatorId: i.creatorId,
    parentId: i.parentId ?? null,
    projectId: i.projectId ?? null,
    cycleId: i.cycleId ?? null,
    estimate: i.estimate ?? null,
    sortOrder: i.sortOrder,
    dueDate: iso(i.dueDate),
    createdAt: isoRequired(i.createdAt),
    updatedAt: isoRequired(i.updatedAt),
    completedAt: iso(i.completedAt),
    canceledAt: iso(i.canceledAt),
  };
}

export function serializeIssueBlockerRef(
  i: DbIssue,
  state: DbWorkflowState,
  t: DbTeam,
): IssueBlockerRef {
  return {
    id: i.id,
    identifier: `${t.key}-${i.number}`,
    teamKey: t.key,
    number: i.number,
    title: i.title,
    state: serializeWorkflowState(state),
    stateName: state.name,
  };
}

export function serializeIssueUsage(value: {
  issueId: string;
  tokens: number;
  updatedAt: Date;
}): IssueUsage {
  return {
    issueId: value.issueId,
    tokens: value.tokens,
    updatedAt: isoRequired(value.updatedAt),
  };
}

export function serializeComment(c: DbComment): Comment {
  return {
    id: c.id,
    issueId: c.issueId,
    authorId: c.authorId,
    body: c.body,
    createdAt: isoRequired(c.createdAt),
    updatedAt: isoRequired(c.updatedAt),
  };
}

export function serializeCommentWithAuthor(
  c: DbComment,
  author: DbUser,
): CommentWithAuthor {
  return {
    ...serializeComment(c),
    author: serializeUserSummary(author),
  };
}

export function serializeActivityWithActor(
  a: DbIssueActivity,
  actor: DbUser,
): IssueActivityWithActor {
  return {
    id: a.id,
    issueId: a.issueId,
    actorId: a.actorId,
    type: a.type,
    data: a.data ?? null,
    createdAt: isoRequired(a.createdAt),
    actor: serializeUserSummary(actor),
  };
}

export function serializeNotification(n: DbNotification): Notification {
  return {
    id: n.id,
    userId: n.userId,
    workspaceId: n.workspaceId,
    issueId: n.issueId ?? null,
    actorId: n.actorId ?? null,
    type: n.type,
    readAt: iso(n.readAt),
    createdAt: isoRequired(n.createdAt),
  };
}

export function serializeApiKey(k: DbApiKey): ApiKey {
  return {
    id: k.id,
    userId: k.userId,
    workspaceId: k.workspaceId,
    name: k.name,
    prefix: k.prefix,
    scopes: parseApiKeyScopes(k.scopes),
    lastUsedAt: iso(k.lastUsedAt),
    createdAt: isoRequired(k.createdAt),
  };
}

export function parseApiKeyScopes(value: string | null | undefined): ApiKeyScope[] {
  if (!value || value === '*') return ['*'];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const scopes = parsed.filter((scope): scope is ApiKeyScope =>
        typeof scope === 'string' && (API_KEY_SCOPES as readonly string[]).includes(scope),
      );
      return scopes.length === 0 ? ['*'] : scopes;
    }
  } catch {
    // Fall through to comma-delimited legacy tolerance.
  }
  const scopes = value
    .split(',')
    .map((scope) => scope.trim())
    .filter((scope): scope is ApiKeyScope =>
      (API_KEY_SCOPES as readonly string[]).includes(scope),
    );
  return scopes.length === 0 ? ['*'] : scopes;
}
