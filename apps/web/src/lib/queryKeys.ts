import type { IssueListFilters } from '@simplekanban/shared';

/**
 * Central query-key registry. Realtime handlers and mutations both reference
 * these so cache invalidation stays in lockstep across the app.
 */
export const qk = {
  authMethods: () => ['authMethods'] as const,

  me: () => ['me'] as const,

  workspace: (ws: string) => ['workspace', ws] as const,

  teamStates: (teamId: string) => ['team', teamId, 'states'] as const,
  teamCycles: (teamId: string) => ['team', teamId, 'cycles'] as const,

  issues: (teamId: string, filters?: IssueListFilters) =>
    ['issues', teamId, filters ?? {}] as const,
  issuesAll: (teamId: string) => ['issues', teamId] as const,

  issue: (id: string) => ['issue', id] as const,
  issueByKey: (identifier: string) => ['issueByKey', identifier] as const,

  labels: (ws: string) => ['labels', ws] as const,
  projects: (ws: string) => ['projects', ws] as const,
  project: (id: string) => ['project', id] as const,

  notifications: (unread?: boolean) =>
    ['notifications', unread ?? false] as const,

  apiKeys: (ws: string) => ['apiKeys', ws] as const,

  search: (ws: string, q: string) => ['search', ws, q] as const,
} as const;
