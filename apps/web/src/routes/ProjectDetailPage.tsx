import { useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import type { IssueWithRelations, ProjectStatus } from '@simplekanban/shared';
import { PROJECT_STATUSES } from '@simplekanban/shared';
import { Star } from 'lucide-react';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useWorkspace } from '@/hooks/useWorkspace';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/ui';
import { useFavoritesStore } from '@/stores/favorites';
import { PageHeader } from '@/components/layout/PageHeader';
import { IssueRow } from '@/components/list/IssueRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ColorDot } from '@/components/ui/Chip';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

export function ProjectDetailPage() {
  const { ws, projectId } = useParams({ strict: false }) as {
    ws: string;
    projectId: string;
  };
  const { data: project, isLoading } = useProject(projectId);
  const { data: workspace } = useWorkspace(ws);
  const updateProject = useUpdateProject(ws);
  const openPeek = useUiStore((s) => s.openPeek);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const favored = isFavorite('project', projectId);

  const teams = workspace?.teams ?? [];

  // Issues belonging to this project, queried per team and merged.
  const queries = useQueries({
    queries: teams.map((team) => ({
      queryKey: ['issues', team.id, { project: projectId }],
      queryFn: () => api.issues.list(team.id, { project: projectId }),
    })),
  });

  const rows = useMemo(() => {
    const out: { issue: IssueWithRelations; teamKey: string }[] = [];
    queries.forEach((q, i) => {
      const team = teams[i];
      if (!team || !q.data) return;
      q.data.forEach((issue) => out.push({ issue, teamKey: team.key }));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.dataUpdatedAt).join(','), teams]);

  // Progress = completed issues / total. We approximate "completed" by the
  // presence of completedAt (set server-side when moved to a completed state).
  const total = rows.length;
  const done = rows.filter((r) => r.issue.completedAt != null).length;
  const frac = total > 0 ? done / total : 0;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!project) return <EmptyState title="Project not found" />;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ColorDot color={project.color ?? 'var(--accent)'} size={10} />
            {project.name}
          </span>
        }
        actions={
          <button
            onClick={() =>
              toggleFavorite({
                entityType: 'project',
                entityId: project.id,
                label: project.name,
                href: `/${ws}/project/${project.id}`,
              })
            }
            className={cn(
              'rounded p-1.5 hover:bg-[var(--hover)]',
              favored ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]',
            )}
          >
            <Star size={15} className={favored ? 'fill-[var(--warning)]' : ''} />
          </button>
        }
      />

      <div className="border-b border-[var(--border)] px-6 py-4">
        {project.description ? (
          <p className="mb-3 max-w-2xl text-sm text-[var(--text-secondary)]">
            {project.description}
          </p>
        ) : null}
        <div className="flex items-center gap-4">
          <SelectMenu
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: s }))}
            value={project.status}
            onSelect={(v) =>
              updateProject.mutate({
                id: project.id,
                input: { status: v as ProjectStatus },
              })
            }
            trigger={
              <button className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2 text-xs capitalize hover:bg-[var(--hover)]">
                {project.status}
              </button>
            }
          />
          <div className="flex flex-1 items-center gap-3">
            <ProgressBar value={frac} color="var(--success)" className="max-w-xs" />
            <span className="text-2xs text-[var(--text-secondary)]">
              {done}/{total} completed
            </span>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="No issues in this project"
          description="Assign issues to this project from any issue's properties."
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
