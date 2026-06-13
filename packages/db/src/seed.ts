import type { Database } from './client.js';
import { workflowState } from './schema.js';

/**
 * Default workflow states seeded into every newly created team.
 * Order / colors / types are fixed by the architecture contract.
 */
export const DEFAULT_WORKFLOW_STATES = [
  { name: 'Backlog', color: '#95a2b3', type: 'backlog', position: 0 },
  { name: 'Todo', color: '#e2e2e2', type: 'unstarted', position: 1 },
  { name: 'In Progress', color: '#f2c94c', type: 'started', position: 2 },
  { name: 'In Review', color: '#5e6ad2', type: 'started', position: 3 },
  { name: 'Done', color: '#5e6ad2', type: 'completed', position: 4 },
  { name: 'Canceled', color: '#95a2b3', type: 'canceled', position: 5 },
] as const satisfies ReadonlyArray<{
  name: string;
  color: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  position: number;
}>;

/**
 * Insert the default six workflow states for a team and return the created rows.
 */
export async function seedTeamDefaults(db: Database, teamId: string) {
  const rows = DEFAULT_WORKFLOW_STATES.map((state) => ({
    teamId,
    name: state.name,
    type: state.type,
    color: state.color,
    position: state.position,
  }));

  return db.insert(workflowState).values(rows).returning();
}
