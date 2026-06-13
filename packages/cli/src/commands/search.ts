import { Command } from 'commander';
import { formatIdentifier } from '@simplekanban/shared';
import {
  loadWorkspaceDetail,
  requireContext,
  type GlobalOptions,
} from '../context.js';
import { dim, printJson, printTable } from '../output.js';
import { priorityLabel } from '../resolve.js';

export function registerSearchCommand(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  program
    .command('search')
    .description('Search issues in the active workspace')
    .argument('<query>', 'search text (matches identifier, title, description)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan search "login bug"
  $ kan search ENG-42 --json`,
    )
    .action(async (query: string) => {
      const global = getGlobal();
      const ctx = requireContext(global);
      const detail = await loadWorkspaceDetail(ctx);
      const results = await ctx.client.search(detail.id, query);

      if (global.json) {
        printJson(results);
        return;
      }

      const teamKeyById = new Map(detail.teams.map((t) => [t.id, t.key]));
      const rows = results.map((issue) => {
        const key = teamKeyById.get(issue.teamId) ?? '?';
        return [
          formatIdentifier(key, issue.number),
          issue.title,
          dim(priorityLabel(issue.priority)),
          issue.assignee ? issue.assignee.name : dim('—'),
        ];
      });
      printTable(
        ['ID', 'TITLE', 'PRIORITY', 'ASSIGNEE'],
        rows,
        'No matches.',
      );
    });
}
