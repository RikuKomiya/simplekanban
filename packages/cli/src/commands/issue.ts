import { Command } from 'commander';
import {
  formatIdentifier,
  parseIdentifier,
  type CreateIssueInput,
  type IssueDetail,
  type IssueWithRelations,
  type Team,
  type UpdateIssueInput,
  type UserSummary,
  type WorkspaceDetail,
} from '@simplekanban/shared';
import {
  CliError,
  loadWorkspaceDetail,
  maybeStdin,
  resolveActiveTeam,
  requireContext,
  type Context,
  type GlobalOptions,
} from '../context.js';
import {
  ResolveError,
  priorityLabel,
  resolveAssignee,
  resolveLabel,
  resolvePriority,
  resolveState,
} from '../resolve.js';
import {
  bold,
  cyan,
  dim,
  out,
  printJson,
  printTable,
} from '../output.js';

/** Collect repeated `--label x --label y` into an array. */
function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function wrapResolve<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ResolveError) {
      throw new CliError('resolve_error', e.message, e.candidates);
    }
    throw e;
  }
}

/** Members embedded in the workspace detail, as UserSummary. */
function workspaceMembers(detail: WorkspaceDetail): UserSummary[] {
  return detail.members.map((m) => m.user);
}

/**
 * Resolve an issue by its identifier (`ENG-42`) to its detail payload, using
 * the by-key endpoint. Returns both the detail and the owning team.
 */
async function fetchByIdentifier(
  ctx: Context,
  detail: WorkspaceDetail,
  identifier: string,
): Promise<{ issue: IssueDetail; team: Team }> {
  const parsed = parseIdentifier(identifier);
  const team = detail.teams.find((t) => t.key === parsed.teamKey);
  if (!team) {
    throw new CliError(
      'team_not_found',
      `No team with key "${parsed.teamKey}" in this workspace.`,
      detail.teams.map((t) => t.key),
    );
  }
  const issue = await ctx.client.issues.getByKey(
    formatIdentifier(parsed.teamKey, parsed.number),
  );
  return { issue, team };
}

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

interface ListOptions {
  team?: string;
  state?: string;
  assignee?: string;
  priority?: string;
  label?: string;
  project?: string;
  cycle?: string;
  query?: string;
  updatedSince?: string;
}

async function runList(opts: ListOptions, global: GlobalOptions): Promise<void> {
  if (opts.team) global.team = opts.team;
  const ctx = requireContext(global);
  const me = await ctx.client.me();
  const detail = await loadWorkspaceDetail(ctx, me);
  const team = resolveActiveTeam(ctx, detail.teams);

  const states = await ctx.client.teams.states(team.id);
  const filters: Record<string, string | number> = {};

  if (opts.state) {
    filters.state = wrapResolve(() => resolveState(states, opts.state!)).id;
  }
  if (opts.assignee) {
    const assigneeId = wrapResolve(() =>
      resolveAssignee(workspaceMembers(detail), opts.assignee!, me.user.id),
    );
    // The API filters by assignee id; "none" → empty means unassigned.
    filters.assignee = assigneeId ?? 'none';
  }
  if (opts.priority) {
    filters.priority = wrapResolve(() => resolvePriority(opts.priority!));
  }
  if (opts.label) {
    filters.label = wrapResolve(() =>
      resolveLabel(detail.labels, opts.label!),
    ).id;
  }
  if (opts.project) filters.project = opts.project;
  if (opts.cycle) filters.cycle = opts.cycle;
  if (opts.query) filters.q = opts.query;
  if (opts.updatedSince) filters.updatedSince = opts.updatedSince;

  const issues = await ctx.client.issues.list(team.id, filters);

  if (global.json) {
    printJson(issues);
    return;
  }
  printIssueTable(issues, team.key, states);
}

function printIssueTable(
  issues: readonly IssueWithRelations[],
  teamKey: string,
  states: readonly { id: string; name: string }[],
): void {
  const stateName = new Map(states.map((s) => [s.id, s.name]));
  const rows = issues.map((issue) => [
    cyan(formatIdentifier(teamKey, issue.number)),
    issue.title,
    stateName.get(issue.stateId) ?? dim('—'),
    dim(priorityLabel(issue.priority)),
    issue.assignee ? issue.assignee.name : dim('—'),
    issue.labels.length > 0
      ? issue.labels.map((l) => l.name).join(',')
      : dim('—'),
  ]);
  printTable(
    ['ID', 'TITLE', 'STATE', 'PRIORITY', 'ASSIGNEE', 'LABELS'],
    rows,
    'No issues.',
  );
}

// ---------------------------------------------------------------------------
// view
// ---------------------------------------------------------------------------

async function runView(
  identifier: string,
  opts: { comments?: boolean },
  global: GlobalOptions,
): Promise<void> {
  const ctx = requireContext(global);
  const detail = await loadWorkspaceDetail(ctx);
  const { issue, team } = await fetchByIdentifier(ctx, detail, identifier);

  if (global.json) {
    printJson(issue);
    return;
  }

  const id = formatIdentifier(team.key, issue.number);
  out(`${bold(cyan(id))}  ${bold(issue.title)}`);
  out();
  out(`${dim('State:')}     ${issue.state.name}`);
  out(`${dim('Priority:')}  ${priorityLabel(issue.priority)}`);
  out(
    `${dim('Assignee:')}  ${issue.assignee ? issue.assignee.name : dim('unassigned')}`,
  );
  out(`${dim('Creator:')}   ${issue.creator.name}`);
  if (issue.labels.length > 0) {
    out(`${dim('Labels:')}    ${issue.labels.map((l) => l.name).join(', ')}`);
  }
  if (issue.estimate !== null) {
    out(`${dim('Estimate:')}  ${issue.estimate}`);
  }
  if (issue.dueDate) {
    out(`${dim('Due:')}       ${issue.dueDate.slice(0, 10)}`);
  }
  out(`${dim('Created:')}   ${issue.createdAt}`);
  out(`${dim('Updated:')}   ${issue.updatedAt}`);

  if (issue.description) {
    out();
    out(dim('── Description ──'));
    out(issue.description);
  }

  if (issue.subIssues.length > 0) {
    out();
    out(dim('── Sub-issues ──'));
    for (const sub of issue.subIssues) {
      out(`  ${cyan(formatIdentifier(team.key, sub.number))}  ${sub.title}`);
    }
  }

  if (opts.comments) {
    out();
    out(dim(`── Comments (${issue.comments.length}) ──`));
    for (const comment of issue.comments) {
      out(
        `  ${bold(comment.author.name)} ${dim(comment.createdAt)}`,
      );
      for (const line of comment.body.split('\n')) {
        out(`    ${line}`);
      }
    }
    if (issue.comments.length === 0) out(dim('  (none)'));
  }
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

interface CreateOptions {
  team?: string;
  title: string;
  description?: string;
  state?: string;
  priority?: string;
  assignee?: string;
  label: string[];
  project?: string;
  cycle?: string;
  estimate?: string;
}

async function runCreate(
  opts: CreateOptions,
  global: GlobalOptions,
): Promise<void> {
  if (opts.team) global.team = opts.team;
  const ctx = requireContext(global);
  const me = await ctx.client.me();
  const detail = await loadWorkspaceDetail(ctx, me);
  const team = resolveActiveTeam(ctx, detail.teams);
  const states = await ctx.client.teams.states(team.id);

  const description = await maybeStdin(opts.description);

  const input: CreateIssueInput = { title: opts.title };
  if (description !== undefined) input.description = description;
  if (opts.state) {
    input.stateId = wrapResolve(() => resolveState(states, opts.state!)).id;
  }
  if (opts.priority) {
    input.priority = wrapResolve(() => resolvePriority(opts.priority!));
  }
  if (opts.assignee) {
    input.assigneeId = wrapResolve(() =>
      resolveAssignee(workspaceMembers(detail), opts.assignee!, me.user.id),
    );
  }
  if (opts.label.length > 0) {
    input.labelIds = opts.label.map(
      (name) => wrapResolve(() => resolveLabel(detail.labels, name)).id,
    );
  }
  if (opts.project) input.projectId = opts.project;
  if (opts.cycle) input.cycleId = opts.cycle;
  if (opts.estimate !== undefined) {
    const n = Number.parseInt(opts.estimate, 10);
    if (Number.isNaN(n)) {
      throw new CliError('invalid_estimate', '--estimate must be an integer.');
    }
    input.estimate = n;
  }

  const created = await ctx.client.issues.create(team.id, input);

  if (global.json) {
    printJson(created);
    return;
  }
  const id = formatIdentifier(team.key, created.number);
  out(`${dim('Created')} ${bold(cyan(id))}  ${created.title}`);
}

// ---------------------------------------------------------------------------
// update / move
// ---------------------------------------------------------------------------

interface UpdateOptions {
  title?: string;
  description?: string;
  state?: string;
  priority?: string;
  assignee?: string;
  project?: string;
  cycle?: string;
  estimate?: string;
  due?: string;
}

async function runUpdate(
  identifier: string,
  opts: UpdateOptions,
  global: GlobalOptions,
): Promise<void> {
  const ctx = requireContext(global);
  const me = await ctx.client.me();
  const detail = await loadWorkspaceDetail(ctx, me);
  const { issue, team } = await fetchByIdentifier(ctx, detail, identifier);
  const states = await ctx.client.teams.states(team.id);

  const patch: UpdateIssueInput = {};
  let touched = false;

  if (opts.title !== undefined) {
    patch.title = opts.title;
    touched = true;
  }
  if (opts.description !== undefined) {
    patch.description = await maybeStdin(opts.description);
    touched = true;
  }
  if (opts.state !== undefined) {
    patch.stateId = wrapResolve(() => resolveState(states, opts.state!)).id;
    touched = true;
  }
  if (opts.priority !== undefined) {
    patch.priority = wrapResolve(() => resolvePriority(opts.priority!));
    touched = true;
  }
  if (opts.assignee !== undefined) {
    patch.assigneeId = wrapResolve(() =>
      resolveAssignee(workspaceMembers(detail), opts.assignee!, me.user.id),
    );
    touched = true;
  }
  if (opts.project !== undefined) {
    patch.projectId = opts.project === '' ? null : opts.project;
    touched = true;
  }
  if (opts.cycle !== undefined) {
    patch.cycleId = opts.cycle === '' ? null : opts.cycle;
    touched = true;
  }
  if (opts.estimate !== undefined) {
    const n = Number.parseInt(opts.estimate, 10);
    if (Number.isNaN(n)) {
      throw new CliError('invalid_estimate', '--estimate must be an integer.');
    }
    patch.estimate = n;
    touched = true;
  }
  if (opts.due !== undefined) {
    patch.dueDate = opts.due === '' ? null : opts.due;
    touched = true;
  }

  if (!touched) {
    throw new CliError(
      'no_changes',
      'No fields to update. Pass at least one of --title/--state/--priority/etc.',
    );
  }

  const updated = await ctx.client.issues.update(issue.id, patch);

  if (global.json) {
    printJson(updated);
    return;
  }
  const id = formatIdentifier(team.key, updated.number);
  out(`${dim('Updated')} ${bold(cyan(id))}  ${updated.title}`);
}

// ---------------------------------------------------------------------------
// comment
// ---------------------------------------------------------------------------

async function runComment(
  identifier: string,
  opts: { body: string },
  global: GlobalOptions,
): Promise<void> {
  const ctx = requireContext(global);
  const detail = await loadWorkspaceDetail(ctx);
  const { issue } = await fetchByIdentifier(ctx, detail, identifier);

  const body = await maybeStdin(opts.body);
  if (body === undefined || body.trim().length === 0) {
    throw new CliError('empty_body', 'Comment body is empty.');
  }

  const comment = await ctx.client.issues.addComment(issue.id, { body });

  if (global.json) {
    printJson(comment);
    return;
  }
  out(`${dim('Added comment to')} ${cyan(identifier)}`);
}

// ---------------------------------------------------------------------------
// registration
// ---------------------------------------------------------------------------

export function registerIssueCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const issue = program.command('issue').description('Work with issues');

  issue
    .command('list')
    .description('List issues for a team (with filters)')
    .option('--team <team>', 'team key or name (overrides default)')
    .option('--state <state>', 'filter by workflow state name')
    .option('--assignee <who>', 'filter by assignee (name, email, or "me")')
    .option('--priority <p>', 'filter by priority (urgent/high/medium/low/none|0-4)')
    .option('--label <label>', 'filter by label name')
    .option('--project <id>', 'filter by project id')
    .option('--cycle <id>', 'filter by cycle id')
    .option('--query <text>', 'full-text filter (title/description)')
    .option('--updated-since <iso>', 'only issues updated since an ISO timestamp')
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue list --team ENG
  $ kan issue list --assignee me --state "In Progress"
  $ kan issue list --priority urgent --json`,
    )
    .action(async (opts: ListOptions) => {
      await runList(opts, getGlobal());
    });

  issue
    .command('view')
    .description('Show full details of an issue')
    .argument('<identifier>', 'issue identifier, e.g. ENG-42')
    .option('--comments', 'include comments in the output')
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue view ENG-42
  $ kan issue view ENG-42 --comments
  $ kan issue view ENG-42 --json`,
    )
    .action(async (identifier: string, opts: { comments?: boolean }) => {
      await runView(identifier, opts, getGlobal());
    });

  issue
    .command('create')
    .description('Create a new issue')
    .requiredOption('--title <title>', 'issue title')
    .option('--team <team>', 'team key or name (overrides default)')
    .option('--description <text>', "description ('-' reads from stdin)")
    .option('--state <state>', 'workflow state name')
    .option('--priority <p>', 'priority (urgent/high/medium/low/none|0-4)')
    .option('--assignee <who>', 'assignee (name, email, or "me")')
    .option('--label <label>', 'label name (repeatable)', collect, [])
    .option('--project <id>', 'project id')
    .option('--cycle <id>', 'cycle id')
    .option('--estimate <n>', 'estimate (integer)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue create --team ENG --title "Fix login"
  $ kan issue create --team ENG --title "Bug" --priority high --assignee me
  $ git log -1 --format=%B | kan issue create --team ENG --title "Recap" --description -`,
    )
    .action(async (opts: CreateOptions) => {
      await runCreate(opts, getGlobal());
    });

  issue
    .command('update')
    .description('Update fields of an existing issue')
    .argument('<identifier>', 'issue identifier, e.g. ENG-42')
    .option('--title <title>', 'new title')
    .option('--description <text>', "new description ('-' reads stdin)")
    .option('--state <state>', 'new workflow state name')
    .option('--priority <p>', 'new priority (urgent/high/medium/low/none|0-4)')
    .option('--assignee <who>', 'new assignee (name, email, "me", or "none")')
    .option('--project <id>', 'project id ("" to clear)')
    .option('--cycle <id>', 'cycle id ("" to clear)')
    .option('--estimate <n>', 'estimate (integer)')
    .option('--due <iso>', 'due date ISO ("" to clear)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue update ENG-42 --state "In Progress"
  $ kan issue update ENG-42 --priority urgent --assignee me
  $ kan issue update ENG-42 --assignee none`,
    )
    .action(async (identifier: string, opts: UpdateOptions) => {
      await runUpdate(identifier, opts, getGlobal());
    });

  issue
    .command('move')
    .description('Move an issue to a new state (alias for update --state)')
    .argument('<identifier>', 'issue identifier, e.g. ENG-42')
    .requiredOption('--state <state>', 'target workflow state name')
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue move ENG-42 --state Done`,
    )
    .action(async (identifier: string, opts: { state: string }) => {
      await runUpdate(identifier, { state: opts.state }, getGlobal());
    });

  issue
    .command('comment')
    .description('Add a comment to an issue')
    .argument('<identifier>', 'issue identifier, e.g. ENG-42')
    .requiredOption('--body <text>', "comment body ('-' reads from stdin)")
    .addHelpText(
      'after',
      `
Examples:
  $ kan issue comment ENG-42 --body "Looking into this"
  $ echo "from a pipe" | kan issue comment ENG-42 --body -`,
    )
    .action(async (identifier: string, opts: { body: string }) => {
      await runComment(identifier, opts, getGlobal());
    });
}
