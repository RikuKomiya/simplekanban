import {
  ApiError,
  createApiClient,
  type ApiClient,
  type Me,
  type Team,
  type Workspace,
  type WorkspaceDetail,
} from '@simplekanban/shared';
import {
  loadFileConfig,
  resolveConfig,
  type ConfigOverrides,
  type ResolvedConfig,
} from './config.js';
import { ResolveError, resolveTeam } from './resolve.js';

/** Raised for user-facing CLI errors with a machine code + message. */
export class CliError extends Error {
  readonly code: string;
  readonly details?: string[];
  constructor(code: string, message: string, details?: string[]) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.details = details;
  }
}

/** Global options threaded down from the root command. */
export interface GlobalOptions {
  json: boolean;
  color: boolean;
  workspace?: string;
  team?: string;
}

/** Per-command runtime context: resolved config + a ready API client. */
export interface Context {
  config: ResolvedConfig;
  client: ApiClient;
  global: GlobalOptions;
}

/**
 * Build a {@link Context}, requiring that an API URL + key are configured.
 * Throws {@link CliError} (`not_authenticated`) when credentials are missing.
 */
export function requireContext(global: GlobalOptions): Context {
  const overrides: ConfigOverrides = {
    workspace: global.workspace,
    team: global.team,
  };
  const config = resolveConfig(loadFileConfig(), process.env, overrides);

  if (!config.apiUrl) {
    throw new CliError(
      'not_configured',
      'No API URL configured. Run `kan auth login` or set KAN_API_URL.',
    );
  }
  if (!config.apiKey) {
    throw new CliError(
      'not_authenticated',
      'No API key configured. Run `kan auth login` or set KAN_API_KEY.',
    );
  }

  const client = createApiClient({
    baseUrl: config.apiUrl,
    apiKey: config.apiKey,
  });

  return { config, client, global };
}

/** Like {@link requireContext} but only needs a URL (login flow uses a custom key). */
export function configContext(global: GlobalOptions): ResolvedConfig {
  const overrides: ConfigOverrides = {
    workspace: global.workspace,
    team: global.team,
  };
  return resolveConfig(loadFileConfig(), process.env, overrides);
}

/**
 * Determine the active workspace id. Order: explicit `--workspace` flag /
 * config default, else the sole workspace from `me()` if there is exactly one.
 * Accepts a workspace id, slug, or name.
 */
export async function resolveWorkspace(
  ctx: Context,
  me?: Me,
): Promise<Workspace> {
  const account = me ?? (await ctx.client.me());
  const workspaces = account.workspaces;
  if (workspaces.length === 0) {
    throw new CliError(
      'no_workspace',
      'Your account has no workspaces.',
    );
  }

  const wanted = ctx.config.defaultWorkspace;
  if (!wanted) {
    if (workspaces.length === 1) return workspaces[0]!;
    throw new CliError(
      'workspace_required',
      'Multiple workspaces available; specify one with --workspace.',
      workspaces.map((w) => `${w.slug} (${w.name})`),
    );
  }

  const n = wanted.trim().toLowerCase();
  const match =
    workspaces.find((w) => w.id === wanted) ??
    workspaces.find((w) => w.slug.toLowerCase() === n) ??
    workspaces.find((w) => w.name.toLowerCase() === n);
  if (!match) {
    throw new CliError(
      'workspace_not_found',
      `Workspace "${wanted}" not found.`,
      workspaces.map((w) => `${w.slug} (${w.name})`),
    );
  }
  return match;
}

/** Load the full workspace detail (teams, members, labels) for the active ws. */
export async function loadWorkspaceDetail(
  ctx: Context,
  me?: Me,
): Promise<WorkspaceDetail> {
  const ws = await resolveWorkspace(ctx, me);
  return ctx.client.workspaces.get(ws.id);
}

/**
 * Resolve the active team. Order: explicit `--team` / config default resolved
 * against the workspace's teams, else the sole team if there is exactly one.
 */
export function resolveActiveTeam(
  ctx: Context,
  teams: readonly Team[],
): Team {
  const wanted = ctx.config.defaultTeam;
  if (!wanted) {
    if (teams.length === 1) return teams[0]!;
    throw new CliError(
      'team_required',
      'Multiple teams available; specify one with --team.',
      teams.map((t) => `${t.key} (${t.name})`),
    );
  }
  try {
    return resolveTeam(teams, wanted);
  } catch (e) {
    if (e instanceof ResolveError) {
      throw new CliError('team_not_found', e.message, e.candidates);
    }
    throw e;
  }
}

/** Read all of stdin to a string (used for `--description -` / `--body -`). */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * If `value` is exactly `-`, read the replacement from stdin; otherwise return
 * `value` unchanged. `undefined` passes through.
 */
export async function maybeStdin(
  value: string | undefined,
): Promise<string | undefined> {
  if (value === undefined) return undefined;
  if (value === '-') return readStdin();
  return value;
}

/** Map an unknown thrown value to a {@link CliError}-compatible code/message. */
export function toErrorParts(e: unknown): {
  code: string;
  message: string;
  details?: string[];
} {
  if (e instanceof CliError) {
    return { code: e.code, message: e.message, details: e.details };
  }
  if (e instanceof ResolveError) {
    return { code: 'resolve_error', message: e.message, details: e.candidates };
  }
  if (e instanceof ApiError) {
    return { code: e.code, message: e.message };
  }
  if (e instanceof Error) {
    // `fetch` wraps network failures in a generic TypeError ("fetch failed")
    // with the real reason in `.cause`. Surface a friendlier code + message.
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code === 'ECONNREFUSED') {
      return {
        code: 'connection_refused',
        message: `Connection refused (${cause.message ?? e.message}).`,
      };
    }
    if (
      e.name === 'TypeError' &&
      e.message === 'fetch failed' &&
      cause?.message
    ) {
      return {
        code: 'network_error',
        message: `Network error: ${cause.message}`,
      };
    }
    return { code: 'error', message: e.message };
  }
  return { code: 'error', message: String(e) };
}
