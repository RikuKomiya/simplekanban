import { createInterface } from 'node:readline/promises';
import { Command } from 'commander';
import { createApiClient } from '@simplekanban/shared';
import { CliError, type GlobalOptions } from '../context.js';
import {
  loadFileConfig,
  resolveConfig,
  saveFileConfig,
  type FileConfig,
} from '../config.js';
import { bold, dim, green, out, printJson } from '../output.js';

interface LoginOptions {
  url?: string;
  key?: string;
}

async function prompt(question: string, mask = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    if (!mask) {
      const answer = await rl.question(question);
      return answer.trim();
    }
    // Minimal masked input: suppress echo by intercepting output writes.
    const output = rl as unknown as {
      output?: NodeJS.WriteStream;
      _writeToOutput?: (s: string) => void;
    };
    let muted = false;
    output._writeToOutput = (s: string): void => {
      if (!muted) process.stderr.write(s);
      else if (s.includes('\n')) process.stderr.write('\n');
    };
    process.stderr.write(question);
    muted = true;
    const answer = await rl.question('');
    muted = false;
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function runLogin(
  opts: LoginOptions,
  global: GlobalOptions,
): Promise<void> {
  const env = process.env;
  const isTty = Boolean(process.stdin.isTTY);

  let url = opts.url ?? env.KAN_API_URL ?? undefined;
  let key = opts.key ?? env.KAN_API_KEY ?? undefined;

  if (!url) {
    if (!isTty) {
      throw new CliError(
        'missing_flag',
        'Non-interactive: --url is required (or set KAN_API_URL).',
      );
    }
    const existing = loadFileConfig().apiUrl;
    const suffix = existing ? ` [${existing}]` : '';
    const answer = await prompt(`API URL${suffix}: `);
    url = answer.length > 0 ? answer : existing;
  }
  if (!url) {
    throw new CliError('missing_flag', 'An API URL is required.');
  }

  if (!key) {
    if (!isTty) {
      throw new CliError(
        'missing_flag',
        'Non-interactive: --key is required (or set KAN_API_KEY).',
      );
    }
    key = await prompt('API key (sk_...): ', true);
  }
  if (!key) {
    throw new CliError('missing_flag', 'An API key is required.');
  }

  // Verify the credentials before persisting.
  const client = createApiClient({ baseUrl: url, apiKey: key });
  const me = await client.me();

  const existing = loadFileConfig();
  const next: FileConfig = {
    ...existing,
    apiUrl: url,
    apiKey: key,
  };
  const path = saveFileConfig(next);

  if (global.json) {
    printJson({ ok: true, user: me.user, workspaces: me.workspaces, configPath: path });
    return;
  }

  out(green('✓ Logged in.'));
  out(`  ${bold(me.user.name)} ${dim(`<${me.user.email}>`)}`);
  if (me.workspaces.length > 0) {
    out(
      dim(
        `  workspaces: ${me.workspaces.map((w) => w.slug).join(', ')}`,
      ),
    );
  }
  out(dim(`  config: ${path} (mode 600)`));
}

async function runStatus(global: GlobalOptions): Promise<void> {
  const file = loadFileConfig();
  const config = resolveConfig(file, process.env, {
    workspace: global.workspace,
    team: global.team,
  });

  if (!config.apiUrl || !config.apiKey) {
    if (global.json) {
      printJson({
        authenticated: false,
        apiUrl: config.apiUrl ?? null,
        configPath: config.path,
      });
      return;
    }
    out(dim('Not configured.'));
    if (!config.apiUrl) out(dim('  missing: API URL (run `kan auth login`)'));
    if (!config.apiKey) out(dim('  missing: API key (run `kan auth login`)'));
    return;
  }

  // Probe the API to confirm the key still works.
  const client = createApiClient({
    baseUrl: config.apiUrl,
    apiKey: config.apiKey,
  });
  const me = await client.me();

  if (global.json) {
    printJson({
      authenticated: true,
      apiUrl: config.apiUrl,
      user: me.user,
      workspaces: me.workspaces,
      configPath: config.path,
    });
    return;
  }

  out(green('✓ Authenticated.'));
  out(`  ${bold(me.user.name)} ${dim(`<${me.user.email}>`)}`);
  out(dim(`  api: ${config.apiUrl}`));
  if (me.workspaces.length > 0) {
    out(dim(`  workspaces: ${me.workspaces.map((w) => w.slug).join(', ')}`));
  }
  const src = process.env.KAN_API_KEY ? 'env (KAN_API_KEY)' : config.path;
  out(dim(`  key source: ${src}`));
}

export function registerAuthCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const auth = program
    .command('auth')
    .description('Authenticate and inspect login status');

  auth
    .command('login')
    .description('Save API URL + key and verify connectivity')
    .option('--url <url>', 'API base URL (e.g. https://app.example.com)')
    .option('--key <key>', 'API key (sk_...)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan auth login --url https://app.example.com --key sk_live_xxx
  $ kan auth login                 # interactive prompts (TTY only)

Credentials are written to ~/.config/kan/config.json with mode 600.
Environment variables KAN_API_URL / KAN_API_KEY override the file at runtime.`,
    )
    .action(async (opts: LoginOptions) => {
      await runLogin(opts, getGlobal());
    });

  auth
    .command('status')
    .description('Show current authentication status (whoami)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan auth status
  $ kan auth status --json`,
    )
    .action(async () => {
      await runStatus(getGlobal());
    });
}
