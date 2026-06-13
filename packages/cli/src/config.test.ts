import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configPath,
  loadFileConfig,
  resolveConfig,
  saveFileConfig,
  type EnvSnapshot,
  type FileConfig,
} from './config.js';

const tmpDirs: string[] = [];

function makeEnv(extra: Partial<EnvSnapshot> = {}): EnvSnapshot {
  const dir = mkdtempSync(join(tmpdir(), 'kan-cfg-'));
  tmpDirs.push(dir);
  return { KAN_CONFIG_DIR: dir, ...extra };
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    rmSync(d, { recursive: true, force: true });
  }
});

describe('configPath', () => {
  test('honors KAN_CONFIG_DIR', () => {
    const env = makeEnv();
    expect(configPath(env)).toBe(join(env.KAN_CONFIG_DIR!, 'config.json'));
  });

  test('falls back to XDG_CONFIG_HOME', () => {
    const env: EnvSnapshot = { XDG_CONFIG_HOME: '/xdg' };
    expect(configPath(env)).toBe('/xdg/kan/config.json');
  });
});

describe('save / load round-trip', () => {
  test('persists and reads back', () => {
    const env = makeEnv();
    const cfg: FileConfig = {
      apiUrl: 'https://api.example.com',
      apiKey: 'sk_test',
      defaultWorkspace: 'acme',
    };
    saveFileConfig(cfg, env);
    expect(loadFileConfig(env)).toEqual(cfg);
  });

  test('writes the file with mode 600', () => {
    const env = makeEnv();
    saveFileConfig({ apiKey: 'sk_secret' }, env);
    const mode = statSync(configPath(env)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test('writes valid pretty JSON', () => {
    const env = makeEnv();
    saveFileConfig({ apiUrl: 'u', apiKey: 'k' }, env);
    const raw = readFileSync(configPath(env), 'utf8');
    expect(JSON.parse(raw)).toEqual({ apiUrl: 'u', apiKey: 'k' });
  });

  test('returns {} when file is absent', () => {
    const env = makeEnv();
    expect(loadFileConfig(env)).toEqual({});
  });
});

describe('resolveConfig precedence (env > file)', () => {
  const file: FileConfig = {
    apiUrl: 'https://file.example.com',
    apiKey: 'file_key',
    defaultWorkspace: 'file-ws',
    defaultTeam: 'FILE',
  };

  test('uses file values when env is empty', () => {
    const r = resolveConfig(file, {});
    expect(r.apiUrl).toBe('https://file.example.com');
    expect(r.apiKey).toBe('file_key');
  });

  test('env overrides file for url + key', () => {
    const r = resolveConfig(file, {
      KAN_API_URL: 'https://env.example.com',
      KAN_API_KEY: 'env_key',
    });
    expect(r.apiUrl).toBe('https://env.example.com');
    expect(r.apiKey).toBe('env_key');
  });

  test('empty env strings do not override file', () => {
    const r = resolveConfig(file, { KAN_API_URL: '', KAN_API_KEY: '' });
    expect(r.apiUrl).toBe('https://file.example.com');
    expect(r.apiKey).toBe('file_key');
  });

  test('flag overrides win for workspace/team', () => {
    const r = resolveConfig(file, {}, { workspace: 'flag-ws', team: 'FLAG' });
    expect(r.defaultWorkspace).toBe('flag-ws');
    expect(r.defaultTeam).toBe('FLAG');
  });

  test('falls back to file defaults when no flag', () => {
    const r = resolveConfig(file, {});
    expect(r.defaultWorkspace).toBe('file-ws');
    expect(r.defaultTeam).toBe('FILE');
  });

  test('partial env: only url overridden', () => {
    const r = resolveConfig(file, { KAN_API_URL: 'https://only-url.example' });
    expect(r.apiUrl).toBe('https://only-url.example');
    expect(r.apiKey).toBe('file_key');
  });
});

describe('loadFileConfig validation', () => {
  test('throws on corrupt JSON', () => {
    const env = makeEnv();
    // Write garbage directly.
    const path = configPath(env);
    saveFileConfig({ apiKey: 'x' }, env);
    require('node:fs').writeFileSync(path, '{ not json');
    expect(() => loadFileConfig(env)).toThrow();
  });
});
