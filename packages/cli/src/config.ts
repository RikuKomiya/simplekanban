import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

/**
 * Persisted configuration shape (`~/.config/kan/config.json`).
 *
 * `apiUrl` / `apiKey` may be overridden by the `KAN_API_URL` / `KAN_API_KEY`
 * environment variables, which take precedence over the file (see
 * {@link resolveConfig}).
 */
export interface FileConfig {
  apiUrl?: string;
  apiKey?: string;
  defaultWorkspace?: string;
  defaultTeam?: string;
}

/** Effective config after applying env + flag precedence. */
export interface ResolvedConfig {
  apiUrl?: string;
  apiKey?: string;
  defaultWorkspace?: string;
  defaultTeam?: string;
  /** Absolute path to the config file backing this resolution. */
  path: string;
}

/** Per-invocation flag overrides (highest precedence). */
export interface ConfigOverrides {
  workspace?: string;
  team?: string;
}

/** Environment snapshot used for resolution (injectable for tests). */
export interface EnvSnapshot {
  KAN_API_URL?: string | undefined;
  KAN_API_KEY?: string | undefined;
  KAN_CONFIG_DIR?: string | undefined;
  XDG_CONFIG_HOME?: string | undefined;
}

function configDir(env: EnvSnapshot): string {
  if (env.KAN_CONFIG_DIR && env.KAN_CONFIG_DIR.length > 0) {
    return env.KAN_CONFIG_DIR;
  }
  const base =
    env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.length > 0
      ? env.XDG_CONFIG_HOME
      : join(homedir(), '.config');
  return join(base, 'kan');
}

/** Absolute path to the config file for the given environment. */
export function configPath(env: EnvSnapshot = process.env): string {
  return join(configDir(env), 'config.json');
}

function isFileConfig(value: unknown): value is FileConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  for (const key of ['apiUrl', 'apiKey', 'defaultWorkspace', 'defaultTeam']) {
    if (key in v && v[key] !== undefined && typeof v[key] !== 'string') {
      return false;
    }
  }
  return true;
}

/** Read & parse the config file. Returns `{}` when absent. Throws on corrupt JSON. */
export function loadFileConfig(env: EnvSnapshot = process.env): FileConfig {
  const path = configPath(env);
  if (!existsSync(path)) return {};
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(
      `Failed to read config at ${path}: ${(err as Error).message}`,
    );
  }
  if (raw.trim().length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Config file at ${path} is not valid JSON.`);
  }
  if (!isFileConfig(parsed)) {
    throw new Error(`Config file at ${path} has an invalid shape.`);
  }
  return parsed;
}

/** Write the config file (creating the directory) with mode 600. */
export function saveFileConfig(
  config: FileConfig,
  env: EnvSnapshot = process.env,
): string {
  const dir = configDir(env);
  mkdirSync(dir, { recursive: true });
  const path = configPath(env);
  const json = `${JSON.stringify(config, null, 2)}\n`;
  // Create restrictive first so the secret never lands world-readable.
  writeFileSync(path, json, { mode: 0o600 });
  // writeFileSync's mode only applies on create; enforce on overwrite too.
  chmodSync(path, 0o600);
  return path;
}

/**
 * Resolve the effective configuration.
 *
 * Precedence (highest wins):
 *   1. CLI flags (`--workspace` / `--team`) — passed via {@link overrides}
 *   2. Environment (`KAN_API_URL` / `KAN_API_KEY`)
 *   3. Config file
 */
export function resolveConfig(
  file: FileConfig,
  env: EnvSnapshot = process.env,
  overrides: ConfigOverrides = {},
): ResolvedConfig {
  const envUrl = env.KAN_API_URL && env.KAN_API_URL.length > 0
    ? env.KAN_API_URL
    : undefined;
  const envKey = env.KAN_API_KEY && env.KAN_API_KEY.length > 0
    ? env.KAN_API_KEY
    : undefined;

  return {
    apiUrl: envUrl ?? file.apiUrl,
    apiKey: envKey ?? file.apiKey,
    defaultWorkspace: overrides.workspace ?? file.defaultWorkspace,
    defaultTeam: overrides.team ?? file.defaultTeam,
    path: configPath(env),
  };
}
