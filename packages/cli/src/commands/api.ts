import { Command } from 'commander';
import {
  CliError,
  maybeStdin,
  requireContext,
  type GlobalOptions,
} from '../context.js';
import { printJson } from '../output.js';

const METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Normalize a user-supplied path to the form the client expects: relative to
 * `/api/v1`. Accepts absolute (`/api/v1/me`), prefixed (`/me`), or bare (`me`).
 */
export function normalizeApiPath(path: string): string {
  let p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    const url = new URL(p);
    p = url.pathname + url.search;
  }
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.startsWith('/api/v1')) {
    p = p.slice('/api/v1'.length);
  }
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

interface ApiOptions {
  data?: string;
}

export function registerApiCommand(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  program
    .command('api')
    .description('Raw API escape hatch (for agents / debugging)')
    .argument('<method>', 'HTTP method: GET, POST, PATCH, PUT, DELETE')
    .argument('<path>', 'path relative to /api/v1 (or absolute)')
    .option('--data <json>', "request body as JSON (or '-' for stdin)")
    .addHelpText(
      'after',
      `
The response body is always printed as raw JSON to stdout.

Examples:
  $ kan api GET /me
  $ kan api GET teams/<id>/issues
  $ kan api POST /issues/<id>/comments --data '{"body":"hi"}'
  $ kan api PATCH /issues/<id> --data - < patch.json`,
    )
    .action(async (methodArg: string, pathArg: string, opts: ApiOptions) => {
      const global = getGlobal();
      const ctx = requireContext(global);

      const method = methodArg.toUpperCase();
      if (!METHODS.has(method)) {
        throw new CliError(
          'invalid_method',
          `Unsupported method "${methodArg}". Use one of: ${[...METHODS].join(', ')}.`,
        );
      }

      const path = normalizeApiPath(pathArg);

      let body: unknown;
      const rawData = await maybeStdin(opts.data);
      if (rawData !== undefined && rawData.trim().length > 0) {
        try {
          body = JSON.parse(rawData);
        } catch {
          throw new CliError('invalid_json', '--data is not valid JSON.');
        }
      }

      const result = await ctx.client.request<unknown>(method, path, {
        body,
      });
      // request() returns parsed `data` envelope already; print raw.
      printJson(result ?? null);
    });
}
