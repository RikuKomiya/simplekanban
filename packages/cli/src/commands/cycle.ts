import { Command } from 'commander';
import {
  loadWorkspaceDetail,
  resolveActiveTeam,
  requireContext,
  type GlobalOptions,
} from '../context.js';
import { dim, printJson, printTable } from '../output.js';

export function registerCycleCommands(
  program: Command,
  getGlobal: () => GlobalOptions,
): void {
  const cycle = program.command('cycle').description('Manage cycles');

  cycle
    .command('list')
    .description('List cycles for the active team')
    .option('--team <team>', 'team key or name (overrides default)')
    .addHelpText(
      'after',
      `
Examples:
  $ kan cycle list --team ENG
  $ kan cycle list --json`,
    )
    .action(async (opts: { team?: string }) => {
      const global = getGlobal();
      if (opts.team) global.team = opts.team;
      const ctx = requireContext(global);
      const detail = await loadWorkspaceDetail(ctx);
      const team = resolveActiveTeam(ctx, detail.teams);
      const cycles = await ctx.client.teams.cycles(team.id);

      if (global.json) {
        printJson(cycles);
        return;
      }

      const rows = cycles.map((cy) => [
        String(cy.number),
        cy.name ?? dim('—'),
        cy.startsAt.slice(0, 10),
        cy.endsAt.slice(0, 10),
        dim(cy.id),
      ]);
      printTable(
        ['#', 'NAME', 'START', 'END', 'ID'],
        rows,
        'No cycles.',
      );
    });
}
