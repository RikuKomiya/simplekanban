#!/usr/bin/env node
import { Command } from 'commander';
import {
  toErrorParts,
  type GlobalOptions,
} from './context.js';
export type { GlobalOptions };
import {
  dim,
  err,
  printJsonError,
  setColor,
} from './output.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerWorkspaceCommands } from './commands/workspace.js';
import { registerTeamCommands } from './commands/team.js';
import { registerIssueCommands } from './commands/issue.js';
import { registerProjectCommands } from './commands/project.js';
import { registerCycleCommands } from './commands/cycle.js';
import { registerSearchCommand } from './commands/search.js';
import { registerApiCommand } from './commands/api.js';

interface RootOptions {
  json?: boolean;
  color?: boolean;
  workspace?: string;
  team?: string;
}

/** The leaf command currently executing, captured in the preAction hook. */
let activeCommand: Command | undefined;

/**
 * Merge the global options from the root command and the executing leaf
 * command so a flag works in either position. Booleans use "either wins"
 * (`--json` anywhere enables JSON; `--no-color` anywhere disables color);
 * string flags prefer the more specific leaf value, falling back to the root.
 */
function computeGlobal(program: Command): GlobalOptions {
  const root = program.opts<RootOptions>();
  const leaf = (activeCommand?.opts() ?? {}) as RootOptions;

  const json = Boolean(root.json) || Boolean(leaf.json);
  // commander sets `color` to false only when --no-color was passed; an unset
  // option is `undefined` on a leaf and `true` (its default) on the root.
  const color = root.color !== false && leaf.color !== false;

  return {
    json,
    color,
    workspace: leaf.workspace ?? root.workspace,
    team: leaf.team ?? root.team,
  };
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name('kan')
    .description(
      'kan — SimpleKanban CLI. A scriptable interface to the SimpleKanban API,\n' +
        'designed for coding agents. Use --json on any command for raw JSON output.',
    )
    .version('0.0.0')
    .option('--json', 'output raw JSON (machine-readable; best for agents)', false)
    .option('--no-color', 'disable colored output')
    .option('--workspace <ws>', 'workspace id, slug, or name (overrides default)')
    .option('--team <team>', 'team key or name (overrides default)')
    .enablePositionalOptions()
    .addHelpText(
      'after',
      `
Configuration:
  Credentials live in ~/.config/kan/config.json (mode 600) and are managed by
  \`kan auth login\`. Environment variables KAN_API_URL and KAN_API_KEY override
  the file. The --workspace / --team flags override config defaults per command.

Common workflow:
  $ kan auth login --url https://app.example.com --key sk_live_xxx
  $ kan issue list --team ENG --assignee me
  $ kan issue view ENG-42 --comments
  $ kan issue create --team ENG --title "Fix flaky test" --priority high
  $ kan issue move ENG-42 --state Done
  $ kan api GET /me            # raw escape hatch

Output:
  Human-friendly tables by default; pass --json for raw API JSON on stdout.
  Errors print to stderr (JSON form under --json) and exit with code 1.`,
    );

  // The global flags are read after parsing; commands fetch them lazily so that
  // options placed before *or* after the subcommand are visible (see
  // computeGlobal). `activeCommand` is set by the preAction hook below.
  const getGlobal = (): GlobalOptions => computeGlobal(program);

  registerAuthCommands(program, getGlobal);
  registerWorkspaceCommands(program, getGlobal);
  registerTeamCommands(program, getGlobal);
  registerIssueCommands(program, getGlobal);
  registerProjectCommands(program, getGlobal);
  registerCycleCommands(program, getGlobal);
  registerSearchCommand(program, getGlobal);
  registerApiCommand(program, getGlobal);

  // Make the global flags accepted *after* the subcommand on every leaf command,
  // not just before it. Options already declared on a command are skipped so we
  // never register a duplicate (e.g. `issue list`'s own `--team`).
  attachGlobalOptions(program);

  return program;
}

/** Names of the global flags we expose on leaf commands. */
const GLOBAL_FLAG_NAMES = new Set(['json', 'color', 'workspace', 'team']);

/** True if `cmd` already declares an option with the given long name. */
function hasOption(cmd: Command, name: string): boolean {
  return cmd.options.some((o) => o.attributeName() === name);
}

/**
 * Recursively attach the missing global options to every leaf (action) command
 * so they can be supplied after the subcommand. Group commands (which only
 * dispatch to subcommands) are skipped.
 */
function attachGlobalOptions(cmd: Command): void {
  if (cmd.commands.length > 0) {
    for (const sub of cmd.commands) attachGlobalOptions(sub);
    return;
  }
  // Leaf command: add only the global flags it doesn't already define.
  if (!hasOption(cmd, 'json')) {
    cmd.option('--json', 'output raw JSON (machine-readable; best for agents)');
  }
  if (!hasOption(cmd, 'color')) {
    cmd.option('--no-color', 'disable colored output');
  }
  if (!hasOption(cmd, 'workspace')) {
    cmd.option(
      '--workspace <ws>',
      'workspace id, slug, or name (overrides default)',
    );
  }
  if (!hasOption(cmd, 'team')) {
    cmd.option('--team <team>', 'team key or name (overrides default)');
  }
}

async function main(): Promise<void> {
  const program = buildProgram();

  // Apply color setting as early as possible (before any output). The action
  // command is captured so getGlobal() can merge flags placed after the
  // subcommand (e.g. `kan issue list --json`).
  program.hook('preAction', (_thisCommand, actionCommand) => {
    activeCommand = actionCommand;
    const { json, color } = computeGlobal(program);
    // Disable color for JSON output and when --no-color is passed.
    setColor(json ? false : color && Boolean(process.stdout.isTTY));
  });

  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    // commander throws for help/version exits with a special code; let those pass.
    const ce = e as { code?: string; exitCode?: number };
    if (
      ce.code === 'commander.helpDisplayed' ||
      ce.code === 'commander.help' ||
      ce.code === 'commander.version'
    ) {
      return;
    }

    const json = computeGlobal(program).json;
    const { code, message, details } = toErrorParts(e);

    if (json) {
      printJsonError(code, message);
    } else {
      err(`error: ${message}`);
      if (details && details.length > 0) {
        err(dim('candidates:'));
        for (const cand of details) err(dim(`  - ${cand}`));
      }
    }
    process.exitCode = 1;
  }
}

void main();
