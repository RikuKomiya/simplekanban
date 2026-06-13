import { Command } from 'commander';
import { requireContext, type GlobalOptions } from '../context.js';
import { bold, dim, printJson, printTable } from '../output.js';

export function registerWorkspaceCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const ws = program
    .command('workspace')
    .description('Manage workspaces');

  ws
    .command('list')
    .description('List workspaces you belong to')
    .addHelpText(
      'after',
      `
Examples:
  $ kan workspace list
  $ kan workspace list --json`,
    )
    .action(async () => {
      const global = getGlobal();
      const ctx = requireContext(global);
      const me = await ctx.client.me();

      if (global.json) {
        printJson(me.workspaces);
        return;
      }

      const active = ctx.config.defaultWorkspace;
      const rows = me.workspaces.map((w) => {
        const isActive =
          active &&
          (w.id === active ||
            w.slug.toLowerCase() === active.toLowerCase() ||
            w.name.toLowerCase() === active.toLowerCase());
        return [
          isActive ? bold(`${w.slug} *`) : w.slug,
          w.name,
          dim(w.id),
        ];
      });
      printTable(['SLUG', 'NAME', 'ID'], rows, 'No workspaces.');
    });
}
