import { useQuery } from '@tanstack/react-query';
import type { IssueListFilters } from '@simplekanban/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** GET /teams/:teamId/states — ordered by position. */
export function useStates(teamId: string | undefined) {
  return useQuery({
    queryKey: qk.teamStates(teamId ?? ''),
    queryFn: async () => {
      const states = await api.teams.states(teamId!);
      return [...states].sort((a, b) => a.position - b.position);
    },
    enabled: !!teamId,
    staleTime: 5 * 60_000,
  });
}

/** GET /teams/:teamId/cycles. */
export function useCycles(teamId: string | undefined) {
  return useQuery({
    queryKey: qk.teamCycles(teamId ?? ''),
    queryFn: () => api.teams.cycles(teamId!),
    enabled: !!teamId,
  });
}

/** GET /teams/:teamId/issues?filters. */
export function useIssues(
  teamId: string | undefined,
  filters?: IssueListFilters,
) {
  return useQuery({
    queryKey: qk.issues(teamId ?? '', filters),
    queryFn: ({ signal }) => api.issues.list(teamId!, filters, signal),
    enabled: !!teamId,
  });
}
