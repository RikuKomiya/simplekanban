import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import type { IssueWithRelations } from '@simplekanban/shared';
import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import { useTeamByKey, useWorkspace } from '@/hooks/useWorkspace';
import { useStates, useIssues } from '@/hooks/useTeamData';
import { useIssueFilters } from '@/hooks/useIssueFilters';
import { useUiStore } from '@/stores/ui';
import { useListNavigation } from '@/hooks/useListNavigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import { IssueRow } from '@/components/list/IssueRow';
import { StateIcon } from '@/components/icons/StateIcon';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function ListPage() {
  const { ws, teamKey } = useParams({ strict: false }) as {
    ws: string;
    teamKey: string;
  };
  const team = useTeamByKey(ws, teamKey);
  const { data: workspace } = useWorkspace(ws);
  const { data: states } = useStates(team?.id);
  const { filters } = useIssueFilters();
  const { data: issues, isLoading } = useIssues(team?.id, filters);
  const openPeek = useUiStore((s) => s.openPeek);
  const openNewIssue = useUiStore((s) => s.openNewIssue);

  const grouped = useMemo(() => {
    const map = new Map<string, IssueWithRelations[]>();
    (states ?? []).forEach((s) => map.set(s.id, []));
    (issues ?? []).forEach((i) => {
      if (!map.has(i.stateId)) map.set(i.stateId, []);
      map.get(i.stateId)!.push(i);
    });
    map.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [states, issues]);

  const flatIds = useMemo(
    () => (states ?? []).flatMap((s) => (grouped.get(s.id) ?? []).map((i) => i.id)),
    [states, grouped],
  );
  const { focusedId } = useListNavigation(flatIds, openPeek, team?.id);

  if (!team) return <EmptyState title="Team not found" />;

  const hasIssues = (issues?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={team.name}
        tabs={
          <>
            <Link
              to="/$ws/team/$teamKey/board"
              params={{ ws, teamKey }}
              className="flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <LayoutGrid size={13} /> Board
            </Link>
            <Link
              to="/$ws/team/$teamKey/issues"
              params={{ ws, teamKey }}
              className="flex h-7 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--hover)] px-2 text-xs font-medium"
            >
              <ListIcon size={13} /> List
            </Link>
          </>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewIssue({ teamId: team.id })}
          >
            <Plus size={14} /> New issue
          </Button>
        }
      />

      <FilterBar
        states={states ?? []}
        members={workspace?.members ?? []}
        labels={workspace?.labels ?? []}
      />

      {isLoading ? (
        <SkeletonRows count={8} />
      ) : !hasIssues ? (
        <EmptyState
          title="No issues"
          description="Create your first issue to get started."
          action={
            <Button variant="primary" onClick={() => openNewIssue({ teamId: team.id })}>
              <Plus size={14} /> New issue
            </Button>
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {(states ?? []).map((state) => {
            const list = grouped.get(state.id) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={state.id}>
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--surface)]/95 px-4 py-1.5 backdrop-blur border-y border-[var(--border)]">
                  <StateIcon type={state.type} color={state.color} size={14} />
                  <span className="text-xs font-medium">{state.name}</span>
                  <span className="text-2xs text-[var(--text-tertiary)]">
                    {list.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]/60">
                  {list.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      teamKey={team.key}
                      onOpen={openPeek}
                      focused={focusedId === issue.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
