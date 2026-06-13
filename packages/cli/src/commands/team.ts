import { Command } from 'commander';
import {
  loadWorkspaceDetail,
  requireContext,
  type GlobalOptions,
} from '../context.js';
import { bold, dim, printJson, printTable } from '../output.js';

export function registerTeamCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const team = program.command('team').description('Manage teams');

  team
    .command('list')
    .description('List teams in the active workspace')
    .addHelpText(
      'after',
      `
Examples:
  $ kan team list
  $ kan team list --workspace acme --json`,
    )
    .action(async () => {
      const global = getGlobal();
      const ctx = requireContext(global);
      const detail = await loadWorkspaceDetail(ctx);

      if (global.json) {
        printJson(detail.teams);
        return;
      }

      const active = ctx.config.defaultTeam?.toLowerCase();
      const rows = detail.teams.map((t) => {
        const isActive =
          active &&
          (t.key.toLowerCase() === active || t.name.toLowerCase() === active);
        return [
          isActive ? bold(`${t.key} *`) : t.key,
          t.name,
          dim(t.id),
        ];
      });
      printTable(['KEY', 'NAME', 'ID'], rows, 'No teams.');
    });
}
