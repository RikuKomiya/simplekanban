import type {
  AddIssueLabelInput,
  AddIssueBlockerInput,
  AddIssueUsageInput,
  CreateApiKeyInput,
  CreateCommentInput,
  CreateCycleInput,
  CreateIssueInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateStateInput,
  CreateTeamInput,
  CreateWorkspaceInput,
  InviteMemberInput,
  IssueListFilters,
  IssueBatchInput,
  UpdateCommentInput,
  UpdateCycleInput,
  UpdateIssueInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateStateInput,
  UpdateTeamInput,
} from './inputs.js';
import type {
  ApiKey,
  ApiKeyWithSecret,
  Comment,
  CommentWithAuthor,
  Cycle,
  Issue,
  IssueDetail,
  IssueActivityWithActor,
  IssueBlockerRef,
  IssueUsage,
  IssueWithRelations,
  Label,
  Me,
  Notification,
  Project,
  Team,
  WorkflowState,
  Workspace,
  WorkspaceDetail,
  WorkspaceMemberWithUser,
} from './schemas.js';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/** Thrown for any non-2xx API response. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface CreateApiClientOptions {
  /** Base URL, e.g. `https://app.example.com` or `http://localhost:8787`. */
  baseUrl: string;
  /** Bearer API key (`sk_...`) for CLI/agent auth. */
  apiKey?: string;
  /** Custom fetch implementation (defaults to global `fetch`). */
  fetch?: FetchLike;
  /** Client id sent as `x-client-id`, used to suppress realtime echo. */
  clientId?: string;
}

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

const API_PREFIX = '/api/v1';

function buildQuery(query?: QueryParams): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

function isErrorBody(
  value: unknown,
): value is { error: { code: string; message: string } } {
  if (typeof value !== 'object' || value === null) return false;
  const err = (value as { error?: unknown }).error;
  if (typeof err !== 'object' || err === null) return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  return typeof code === 'string' && typeof message === 'string';
}

function isDataEnvelope(value: unknown): value is { data: unknown } {
  return (
    typeof value === 'object' && value !== null && 'data' in value
  );
}

/**
 * Typed REST client covering every `/api/v1` endpoint in the architecture
 * contract. Shared by the web app and the CLI.
 */
export function createApiClient(options: CreateApiClientOptions) {
  const fetchImpl: FetchLike = options.fetch ?? (globalThis.fetch as FetchLike);
  const base = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const url = `${base}${API_PREFIX}${path}${buildQuery(opts.query)}`;

    const headers: Record<string, string> = {};
    if (options.apiKey) {
      headers['Authorization'] = `Bearer ${options.apiKey}`;
    }
    if (options.clientId) {
      headers['x-client-id'] = options.clientId;
    }

    const init: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    if (opts.signal) {
      init.signal = opts.signal;
    }
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetchImpl(url, init);

    if (res.status === 204) {
      return undefined as T;
    }

    let parsed: unknown = undefined;
    const text = await res.text();
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      if (isErrorBody(parsed)) {
        throw new ApiError(parsed.error.code, res.status, parsed.error.message);
      }
      throw new ApiError(
        'unknown_error',
        res.status,
        text || `Request failed with status ${res.status}`,
      );
    }

    if (isDataEnvelope(parsed)) {
      return parsed.data as T;
    }
    return parsed as T;
  }

  const get = <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal });
  const post = <T>(path: string, body?: unknown) =>
    request<T>('POST', path, { body });
  const patch = <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body });
  const del = <T>(path: string) => request<T>('DELETE', path);

  return {
    /** Low-level escape hatch (used by `kan api`). Returns parsed `data`. */
    request,

    /** GET /me */
    me: () => get<Me>('/me'),

    workspaces: {
      /** POST /workspaces */
      create: (input: CreateWorkspaceInput) =>
        post<Workspace>('/workspaces', input),
      /** GET /workspaces/:ws */
      get: (ws: string) => get<WorkspaceDetail>(`/workspaces/${ws}`),
      /** POST /workspaces/:ws/members */
      inviteMember: (ws: string, input: InviteMemberInput) =>
        post<WorkspaceMemberWithUser>(`/workspaces/${ws}/members`, input),
      /** GET /workspaces/:ws/teams */
      teams: (ws: string) => get<Team[]>(`/workspaces/${ws}/teams`),
      /** POST /workspaces/:ws/teams */
      createTeam: (ws: string, input: CreateTeamInput) =>
        post<Team>(`/workspaces/${ws}/teams`, input),
      /** GET /workspaces/:ws/labels */
      labels: (ws: string) => get<Label[]>(`/workspaces/${ws}/labels`),
      /** POST /workspaces/:ws/labels */
      createLabel: (ws: string, input: CreateLabelInput) =>
        post<Label>(`/workspaces/${ws}/labels`, input),
      /** GET /workspaces/:ws/projects */
      projects: (ws: string) => get<Project[]>(`/workspaces/${ws}/projects`),
      /** POST /workspaces/:ws/projects */
      createProject: (ws: string, input: CreateProjectInput) =>
        post<Project>(`/workspaces/${ws}/projects`, input),
      /** GET /workspaces/:ws/api-keys */
      apiKeys: (ws: string) => get<ApiKey[]>(`/workspaces/${ws}/api-keys`),
      /** POST /workspaces/:ws/api-keys */
      createApiKey: (ws: string, input: CreateApiKeyInput) =>
        post<ApiKeyWithSecret>(`/workspaces/${ws}/api-keys`, input),
    },

    teams: {
      /** GET /teams/:teamId */
      get: (teamId: string) => get<Team>(`/teams/${teamId}`),
      /** PATCH /teams/:teamId */
      update: (teamId: string, input: UpdateTeamInput) =>
        patch<Team>(`/teams/${teamId}`, input),
      /** DELETE /teams/:teamId */
      delete: (teamId: string) => del<void>(`/teams/${teamId}`),
      /** GET /teams/:teamId/states */
      states: (teamId: string) =>
        get<WorkflowState[]>(`/teams/${teamId}/states`),
      /** POST /teams/:teamId/states */
      createState: (teamId: string, input: CreateStateInput) =>
        post<WorkflowState>(`/teams/${teamId}/states`, input),
      /** GET /teams/:teamId/cycles */
      cycles: (teamId: string) => get<Cycle[]>(`/teams/${teamId}/cycles`),
      /** POST /teams/:teamId/cycles */
      createCycle: (teamId: string, input: CreateCycleInput) =>
        post<Cycle>(`/teams/${teamId}/cycles`, input),
    },

    states: {
      /** PATCH /states/:id */
      update: (id: string, input: UpdateStateInput) =>
        patch<WorkflowState>(`/states/${id}`, input),
      /** DELETE /states/:id */
      delete: (id: string) => del<void>(`/states/${id}`),
    },

    issues: {
      /** GET /teams/:teamId/issues */
      list: (
        teamId: string,
        filters?: IssueListFilters,
        signal?: AbortSignal,
      ) =>
        get<IssueWithRelations[]>(
          `/teams/${teamId}/issues`,
          filters as QueryParams | undefined,
          signal,
        ),
      /** POST /teams/:teamId/issues */
      create: (teamId: string, input: CreateIssueInput) =>
        post<IssueDetail>(`/teams/${teamId}/issues`, input),
      /** POST /issues/batch */
      batch: (input: IssueBatchInput) =>
        post<IssueWithRelations[]>('/issues/batch', input),
      /** GET /issues/:id */
      get: (id: string) => get<IssueDetail>(`/issues/${id}`),
      /** GET /issues/by-key/:identifier */
      getByKey: (identifier: string) =>
        get<IssueDetail>(`/issues/by-key/${identifier}`),
      /** PATCH /issues/:id */
      update: (id: string, patchInput: UpdateIssueInput) =>
        patch<IssueDetail>(`/issues/${id}`, patchInput),
      /** DELETE /issues/:id */
      delete: (id: string) => del<void>(`/issues/${id}`),
      /** POST /issues/:id/comments */
      addComment: (id: string, input: CreateCommentInput) =>
        post<Comment>(`/issues/${id}/comments`, input),
      /** GET /issues/:id/comments */
      comments: (id: string) =>
        get<CommentWithAuthor[]>(`/issues/${id}/comments`),
      /** GET /issues/:id/activity */
      activity: (id: string) =>
        get<IssueActivityWithActor[]>(`/issues/${id}/activity`),
      /** GET /issues/:id/blockers */
      blockers: (id: string) =>
        get<IssueBlockerRef[]>(`/issues/${id}/blockers`),
      /** POST /issues/:id/blockers */
      addBlocker: (id: string, input: AddIssueBlockerInput) =>
        post<IssueDetail>(`/issues/${id}/blockers`, input),
      /** DELETE /issues/:id/blockers/:blockerIssueId */
      removeBlocker: (id: string, blockerIssueId: string) =>
        del<void>(`/issues/${id}/blockers/${blockerIssueId}`),
      /** POST /issues/:id/usage */
      addUsage: (id: string, input: AddIssueUsageInput) =>
        post<IssueUsage>(`/issues/${id}/usage`, input),
      /** POST /issues/:id/labels */
      addLabel: (id: string, input: AddIssueLabelInput) =>
        post<void>(`/issues/${id}/labels`, input),
      /** DELETE /issues/:id/labels/:labelId */
      removeLabel: (id: string, labelId: string) =>
        del<void>(`/issues/${id}/labels/${labelId}`),
    },

    comments: {
      /** PATCH /comments/:id */
      update: (id: string, input: UpdateCommentInput) =>
        patch<Comment>(`/comments/${id}`, input),
      /** DELETE /comments/:id */
      delete: (id: string) => del<void>(`/comments/${id}`),
    },

    labels: {
      /** PATCH /labels/:id */
      update: (id: string, input: UpdateLabelInput) =>
        patch<Label>(`/labels/${id}`, input),
      /** DELETE /labels/:id */
      delete: (id: string) => del<void>(`/labels/${id}`),
    },

    projects: {
      /** GET /projects/:id */
      get: (id: string) => get<Project>(`/projects/${id}`),
      /** PATCH /projects/:id */
      update: (id: string, input: UpdateProjectInput) =>
        patch<Project>(`/projects/${id}`, input),
      /** DELETE /projects/:id */
      delete: (id: string) => del<void>(`/projects/${id}`),
    },

    cycles: {
      /** GET /cycles/:id */
      get: (id: string) => get<Cycle>(`/cycles/${id}`),
      /** PATCH /cycles/:id */
      update: (id: string, input: UpdateCycleInput) =>
        patch<Cycle>(`/cycles/${id}`, input),
      /** DELETE /cycles/:id */
      delete: (id: string) => del<void>(`/cycles/${id}`),
    },

    notifications: {
      /** GET /notifications?unread=1 */
      list: (unread?: boolean) =>
        get<Notification[]>(
          '/notifications',
          unread ? { unread: 1 } : undefined,
        ),
      /** POST /notifications/:id/read */
      markRead: (id: string) => post<void>(`/notifications/${id}/read`),
      /** POST /notifications/read-all */
      markAllRead: () => post<void>('/notifications/read-all'),
    },

    apiKeys: {
      /** DELETE /api-keys/:id */
      delete: (id: string) => del<void>(`/api-keys/${id}`),
    },

    /** GET /workspaces/:ws/search?q= */
    search: (ws: string, q: string) =>
      get<IssueWithRelations[]>(`/workspaces/${ws}/search`, { q }),

    /** GET /openapi.json */
    openapi: () => get<unknown>('/openapi.json'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
