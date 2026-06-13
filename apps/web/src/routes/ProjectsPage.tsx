import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ProjectStatus } from '@simplekanban/shared';
import { PROJECT_STATUSES } from '@simplekanban/shared';
import { Folders, Plus } from 'lucide-react';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorDot } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/Dialog';

const STATUS_COLOR: Record<ProjectStatus, string> = {
  backlog: 'var(--text-tertiary)',
  planned: '#56a3f5',
  started: '#f2c94c',
  paused: 'var(--text-secondary)',
  completed: 'var(--success)',
  canceled: 'var(--destructive)',
};

export function ProjectsPage() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects(ws);
  const createProject = useCreateProject(ws);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    const created = await createProject.mutateAsync({ name: name.trim() });
    setOpen(false);
    setName('');
    navigate({ to: '/$ws/project/$projectId', params: { ws, projectId: created.id } });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Projects"
        icon={<Folders size={15} />}
        actions={
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> New project
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonRows count={5} />
      ) : (projects?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Folders size={28} />}
          title="No projects yet"
          description="Group related issues into a project to track progress."
          action={
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus size={14} /> New project
            </Button>
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects!.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  navigate({
                    to: '/$ws/project/$projectId',
                    params: { ws, projectId: p.id },
                  })
                }
                className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="flex items-center gap-2">
                  <ColorDot color={p.color ?? 'var(--accent)'} size={10} />
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span
                    className="ml-auto flex items-center gap-1 text-2xs capitalize"
                    style={{ color: STATUS_COLOR[p.status] }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[p.status] }}
                    />
                    {p.status}
                  </span>
                </div>
                {p.description ? (
                  <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {p.description}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-5" showClose ariaLabel="New project">
          <DialogTitle className="mb-4">New project</DialogTitle>
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Project name"
            />
            <Button
              variant="primary"
              disabled={!name.trim() || createProject.isPending}
              onClick={submit}
            >
              Create project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { PROJECT_STATUSES };
