import { useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import type { Cycle } from '@simplekanban/shared';
import { Plus } from 'lucide-react';
import { useTeamByKey } from '@/hooks/useWorkspace';
import { useCycles, useStates } from '@/hooks/useTeamData';
import { useCreateCycle } from '@/hooks/useCyclesMutations';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { formatDate, dateInputToIso } from '@/lib/format';
import { StateIcon } from '@/components/icons/StateIcon';

type Bucket = 'current' | 'upcoming' | 'past';

function bucketOf(c: Cycle): Bucket {
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'current';
}

export function CyclesPage() {
  const { ws, teamKey } = useParams({ strict: false }) as {
    ws: string;
    teamKey: string;
  };
  const team = useTeamByKey(ws, teamKey);
  const { data: cycles, isLoading } = useCycles(team?.id);
  const { data: states } = useStates(team?.id);
  const createCycle = useCreateCycle(team?.id ?? '');

  const completedStateIds = useMemo(
    () =>
      new Set(
        (states ?? [])
          .filter((s) => s.type === 'completed' || s.type === 'canceled')
          .map((s) => s.id),
      ),
    [states],
  );

  // Issue progress per cycle.
  const issueQueries = useQueries({
    queries: (cycles ?? []).map((c) => ({
      queryKey: ['issues', team?.id, { cycle: c.id }],
      queryFn: () => api.issues.list(team!.id, { cycle: c.id }),
      enabled: !!team?.id,
    })),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const buckets: Record<Bucket, Cycle[]> = { current: [], upcoming: [], past: [] };
  (cycles ?? []).forEach((c) => buckets[bucketOf(c)].push(c));

  const progressFor = (cycle: Cycle) => {
    const idx = (cycles ?? []).findIndex((c) => c.id === cycle.id);
    const list = issueQueries[idx]?.data ?? [];
    const total = list.length;
    const done = list.filter((i) => completedStateIds.has(i.stateId)).length;
    return { total, done, frac: total > 0 ? done / total : 0 };
  };

  const submit = async () => {
    const s = dateInputToIso(startsAt);
    const e = dateInputToIso(endsAt);
    if (!s || !e) return;
    await createCycle.mutateAsync({ name: name.trim() || null, startsAt: s, endsAt: e });
    setOpen(false);
    setName('');
    setStartsAt('');
    setEndsAt('');
  };

  if (!team) return <EmptyState title="Team not found" />;

  const renderBucket = (title: string, list: Cycle[]) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="mb-2 text-2xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          {title}
        </div>
        <div className="flex flex-col gap-2">
          {list.map((c) => {
            const p = progressFor(c);
            return (
              <div
                key={c.id}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-center gap-2">
                  <StateIcon type="started" color="var(--accent)" size={15} />
                  <span className="text-sm font-medium">
                    {c.name ?? `Cycle ${c.number}`}
                  </span>
                  <span className="text-2xs text-[var(--text-tertiary)]">
                    {formatDate(c.startsAt)} – {formatDate(c.endsAt)}
                  </span>
                  <span className="ml-auto text-2xs text-[var(--text-secondary)]">
                    {p.done}/{p.total} done
                  </span>
                </div>
                <ProgressBar value={p.frac} className="mt-2.5" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={`${team.name} · Cycles`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> New cycle
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ) : (cycles?.length ?? 0) === 0 ? (
          <EmptyState
            title="No cycles yet"
            description="Cycles are time-boxed sprints. Create one to plan work."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus size={14} /> New cycle
              </Button>
            }
          />
        ) : (
          <>
            {renderBucket('Current', buckets.current)}
            {renderBucket('Upcoming', buckets.upcoming)}
            {renderBucket('Past', buckets.past)}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-5" showClose ariaLabel="New cycle">
          <DialogTitle className="mb-4">New cycle</DialogTitle>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-secondary)]">
                Name (optional)
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint 1"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Starts</span>
                <Input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Ends</span>
                <Input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </label>
            </div>
            <Button
              variant="primary"
              className="mt-1"
              disabled={!startsAt || !endsAt || createCycle.isPending}
              onClick={submit}
            >
              Create cycle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
