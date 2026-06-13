import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** GET /me — current user + their workspaces. */
export function useMe() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => api.me(),
    staleTime: 60_000,
  });
}

/** GET /workspaces/:ws — detail (teams, members, labels). */
export function useWorkspace(ws: string | undefined) {
  return useQuery({
    queryKey: qk.workspace(ws ?? ''),
    queryFn: () => api.workspaces.get(ws!),
    enabled: !!ws,
  });
}

/** Resolve a team by its key (e.g. "ENG") within a workspace. */
export function useTeamByKey(ws: string | undefined, teamKey: string | undefined) {
  const { data: workspace } = useWorkspace(ws);
  const team = workspace?.teams.find(
    (t) => t.key.toLowerCase() === teamKey?.toLowerCase(),
  );
  return team;
}
