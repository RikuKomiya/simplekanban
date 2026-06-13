import { useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import type { IssueWithRelations } from '@simplekanban/shared';
import { CircleUser } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { IssueRow } from '@/components/list/IssueRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';

export function MyIssuesPage() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const openPeek = useUiStore((s) => s.openPeek);

  const teams = workspace?.teams ?? [];

  // Fetch each team's issues assigned to me, then merge.
  const queries = useQueries({
    queries: teams.map((team) => ({
      queryKey: ['issues', team.id, { assignee: myId }],
      queryFn: () => api.issues.list(team.id, myId ? { assignee: myId } : {}),
      enabled: !!myId,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const rows = useMemo(() => {
    const out: { issue: IssueWithRelations; teamKey: string }[] = [];
    queries.forEach((q, i) => {
      const team = teams[i];
      if (!team || !q.data) return;
      q.data.forEach((issue) => out.push({ issue, teamKey: team.key }));
    });
    // Sort by updatedAt desc.
    out.sort(
      (a, b) =>
        new Date(b.issue.updatedAt).getTime() -
        new Date(a.issue.updatedAt).getTime(),
    );
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.dataUpdatedAt).join(','), teams]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="My Issues" icon={<CircleUser size={15} />} />
      {isLoading ? (
        <SkeletonRows count={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CircleUser size={28} />}
          title="No issues assigned to you"
          description="Issues assigned to you across all teams will show up here."
        />
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60">
          {rows.map(({ issue, teamKey }) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              teamKey={teamKey}
              onOpen={openPeek}
            />
          ))}
        </div>
      )}
    </div>
  );
}
