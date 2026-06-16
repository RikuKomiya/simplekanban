import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  STATE_TYPES,
  type StateType,
  type WorkflowState,
} from '@simplekanban/shared';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useStates } from '@/hooks/useTeamData';
import {
  useCreateWorkflowState,
  useDeleteWorkflowState,
  useUpdateWorkflowState,
} from '@/hooks/useWorkflowStates';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StateIcon } from '@/components/icons/StateIcon';
import { cn } from '@/lib/cn';

const STATUS_COLORS = [
  '#95a2b3',
  '#e2e2e2',
  '#f2c94c',
  '#5e6ad2',
  '#26b5ce',
  '#4cb782',
  '#bb87fc',
  '#eb5757',
] as const;

const STATE_TYPE_LABELS: Record<StateType, string> = {
  backlog: 'Backlog',
  unstarted: 'Todo',
  started: 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

export function StatusesSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const teams = useMemo(() => workspace?.teams ?? [], [workspace?.teams]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0];
  const { data: states, isLoading } = useStates(selectedTeam?.id);

  const createState = useCreateWorkflowState(selectedTeam?.id);
  const updateState = useUpdateWorkflowState(selectedTeam?.id);
  const deleteState = useDeleteWorkflowState(selectedTeam?.id);

  const [name, setName] = useState('');
  const [type, setType] = useState<StateType>('started');
  const [color, setColor] = useState<string>(STATUS_COLORS[2]);

  useEffect(() => {
    if (teams.length === 0) {
      setSelectedTeamId(undefined);
      return;
    }
    if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0]!.id);
    }
  }, [selectedTeamId, teams]);

  const sortedStates = states ?? [];

  const submit = async () => {
    if (!selectedTeam || !name.trim()) return;
    try {
      await createState.mutateAsync({
        name: name.trim(),
        type,
        color,
      });
      setName('');
    } catch {
      // Toast is handled by the mutation hook.
    }
  };

  const patchState = (state: WorkflowState, input: Partial<WorkflowState>) => {
    updateState.mutate({
      id: state.id,
      input: {
        name: input.name,
        type: input.type,
        color: input.color,
        position: input.position,
      },
    });
  };

  const moveState = async (index: number, direction: -1 | 1) => {
    const current = sortedStates[index];
    const next = sortedStates[index + direction];
    if (!current || !next) return;
    try {
      await Promise.all([
        updateState.mutateAsync({
          id: current.id,
          input: { position: next.position },
        }),
        updateState.mutateAsync({
          id: next.id,
          input: { position: current.position },
        }),
      ]);
    } catch {
      // Toast is handled by the mutation hook.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">Statuses</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Customize the workflow statuses for each team board.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {teams.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">
            Create a team before adding statuses.
          </p>
        ) : (
          teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeamId(team.id)}
              className={cn(
                'inline-flex h-7 items-center gap-2 rounded-[var(--radius)] border px-2 text-xs font-medium',
                selectedTeam?.id === team.id
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
              )}
            >
              <span className="font-mono">{team.key}</span>
              <span>{team.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto_auto]">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Status name"
          disabled={!selectedTeam}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as StateType)}
          disabled={!selectedTeam}
          className="h-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        >
          {STATE_TYPES.map((stateType) => (
            <option key={stateType} value={stateType}>
              {STATE_TYPE_LABELS[stateType]}
            </option>
          ))}
        </select>
        <ColorSwatches color={color} onSelect={setColor} disabled={!selectedTeam} />
        <Button
          variant="primary"
          disabled={!selectedTeam || !name.trim() || createState.isPending}
          onClick={submit}
        >
          <Plus size={14} />
          Add
        </Button>
      </div>

      <div className="flex flex-col rounded-md border border-[var(--border)]">
        {!selectedTeam ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            No team selected.
          </p>
        ) : isLoading ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            Loading statuses…
          </p>
        ) : sortedStates.length === 0 ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            No statuses yet.
          </p>
        ) : (
          sortedStates.map((state, index) => (
            <div
              key={state.id}
              className="grid grid-cols-[minmax(0,1fr)_150px_auto_auto] items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <StateIcon type={state.type} color={state.color} size={15} />
                <input
                  key={`${state.id}:${state.name}`}
                  defaultValue={state.name}
                  onBlur={(e) => {
                    const nextName = e.target.value.trim();
                    if (!nextName) {
                      e.target.value = state.name;
                      return;
                    }
                    if (nextName !== state.name) {
                      patchState(state, { name: nextName });
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <select
                value={state.type}
                onChange={(e) =>
                  patchState(state, { type: e.target.value as StateType })
                }
                className="h-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              >
                {STATE_TYPES.map((stateType) => (
                  <option key={stateType} value={stateType}>
                    {STATE_TYPE_LABELS[stateType]}
                  </option>
                ))}
              </select>
              <ColorSwatches
                color={state.color}
                onSelect={(nextColor) => patchState(state, { color: nextColor })}
              />
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => moveState(index, -1)}
                  disabled={index === 0 || updateState.isPending}
                  title="Move up"
                  aria-label="Move status up"
                  className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveState(index, 1)}
                  disabled={index === sortedStates.length - 1 || updateState.isPending}
                  title="Move down"
                  aria-label="Move status down"
                  className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteState.mutate(state.id)}
                  disabled={deleteState.isPending}
                  title="Delete"
                  aria-label="Delete status"
                  className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ColorSwatches({
  color,
  onSelect,
  disabled,
}: {
  color: string;
  onSelect: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-8 items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] px-2">
      {STATUS_COLORS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onSelect(preset)}
          disabled={disabled}
          title={preset}
          aria-label={`Set color ${preset}`}
          className="h-4 w-4 rounded-full ring-offset-1 ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-40"
          data-active={preset === color}
          style={{
            backgroundColor: preset,
            boxShadow:
              preset === color
                ? `0 0 0 2px var(--bg), 0 0 0 3px ${preset}`
                : undefined,
          }}
        />
      ))}
    </div>
  );
}
