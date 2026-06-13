import { Command } from 'commander';
import {
  resolveWorkspace,
  requireContext,
  type GlobalOptions,
} from '../context.js';
import { dim, printJson, printTable } from '../output.js';

export function registerProjectCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const project = program.command('project').description('Manage projects');

  project
    .command('list')
    .description('List projects in the active workspace')
    .addHelpText(
      'after',
      `
Examples:
  $ kan project list
  $ kan project list --json`,
    )
    .action(async () => {
      const global = getGlobal();
      const ctx = requireContext(global);
      const ws = await resolveWorkspace(ctx);
      const projects = await ctx.client.workspaces.projects(ws.id);

      if (global.json) {
        printJson(projects);
        return;
      }

      const rows = projects.map((p) => [
        p.name,
        p.status,
        p.targetDate ? p.targetDate.slice(0, 10) : dim('—'),
        dim(p.id),
      ]);
      printTable(['NAME', 'STATUS', 'TARGET', 'ID'], rows, 'No projects.');
    });
}
