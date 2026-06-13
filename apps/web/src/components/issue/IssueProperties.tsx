import { useParams } from '@tanstack/react-router';
import type { IssueDetail, PriorityValue } from '@simplekanban/shared';
import { PRIORITY_LABELS } from '@simplekanban/shared';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useStates, useCycles } from '@/hooks/useTeamData';
import { useProjects } from '@/hooks/useProjects';
import { useUpdateIssue } from '@/hooks/useIssue';
import { useToggleIssueLabel } from '@/hooks/useIssueLabels';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { StateIcon } from '@/components/icons/StateIcon';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { Chip, ColorDot } from '@/components/ui/Chip';
import {
  assigneeOptions,
  labelOptions,
  priorityFromString,
  priorityOptions,
  stateOptions,
} from '@/components/pickers/options';
import { formatDate, formatDateInput, dateInputToIso } from '@/lib/format';

const ROW = 'flex items-center gap-2 py-1.5';
const LABEL = 'w-[88px] shrink-0 text-2xs text-[var(--text-tertiary)]';
const PILL =
  'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] px-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] transition-colors max-w-full';

export function IssueProperties({ issue }: { issue: IssueDetail }) {
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const { data: workspace } = useWorkspace(ws);
  const { data: states } = useStates(issue.teamId);
  const { data: cycles } = useCycles(issue.teamId);
  const { data: projects } = useProjects(ws);
  const updateIssue = useUpdateIssue();
  const toggleLabel = useToggleIssueLabel(issue.id);

  const members = workspace?.members ?? [];
  const allLabels = workspace?.labels ?? [];
  const assignee = issue.assignee;
  const state = issue.state;
  const project = projects?.find((p) => p.id === issue.projectId);
  const cycle = cycles?.find((c) => c.id === issue.cycleId);

  const patch = (data: Parameters<typeof updateIssue.mutate>[0]['patch']) =>
    updateIssue.mutate({ id: issue.id, patch: data });

  return (
    <div className="flex flex-col text-sm">
      {/* Status */}
      <div className={ROW}>
        <span className={LABEL}>Status</span>
        <SelectMenu
          options={states ? stateOptions(states) : []}
          value={issue.stateId}
          onSelect={(v) => patch({ stateId: v })}
          searchPlaceholder="Change status…"
          trigger={
            <button className={PILL}>
              <StateIcon type={state.type} color={state.color} size={15} />
              {state.name}
            </button>
          }
        />
      </div>

      {/* Priority */}
      <div className={ROW}>
        <span className={LABEL}>Priority</span>
        <SelectMenu
          options={priorityOptions()}
          value={String(issue.priority)}
          onSelect={(v) => patch({ priority: priorityFromString(v) })}
          searchPlaceholder="Set priority…"
          trigger={
            <button className={PILL}>
              <PriorityIcon priority={issue.priority as PriorityValue} size={15} />
              {PRIORITY_LABELS[issue.priority as PriorityValue]}
            </button>
          }
        />
      </div>

      {/* Assignee */}
      <div className={ROW}>
        <span className={LABEL}>Assignee</span>
        <SelectMenu
          options={assigneeOptions(members.map((m) => m.user))}
          value={issue.assigneeId ?? '__none__'}
          onSelect={(v) =>
            patch({ assigneeId: v === '__none__' ? null : v })
          }
          searchPlaceholder="Assign to…"
          trigger={
            <button className={PILL}>
              {assignee ? (
                <>
                  <Avatar
                    id={assignee.id}
                    name={assignee.name || assignee.email}
                    email={assignee.email}
                    image={assignee.image}
                    size={16}
                  />
                  {assignee.name || assignee.email}
                </>
              ) : (
                <>
                  <span className="block h-4 w-4 rounded-full border border-dashed border-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-secondary)]">Unassigned</span>
                </>
              )}
            </button>
          }
        />
      </div>

      {/* Labels */}
      <div className="flex items-start gap-2 py-1.5">
        <span className={`${LABEL} pt-1.5`}>Labels</span>
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {issue.labels.map((l) => (
            <Chip
              key={l.id}
              color={l.color}
              onRemove={() => toggleLabel.mutate({ label: l, attached: true })}
            >
              {l.name}
            </Chip>
          ))}
          <SelectMenu
            options={labelOptions(allLabels)}
            value={issue.labels.map((l) => l.id)}
            multiple
            onSelect={(v) => {
              const label = allLabels.find((l) => l.id === v);
              if (!label) return;
              const attached = issue.labels.some((l) => l.id === v);
              toggleLabel.mutate({ label, attached });
            }}
            searchPlaceholder="Add labels…"
            trigger={
              <button className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 text-2xs text-[var(--text-secondary)] hover:bg-[var(--hover)]">
                <ColorDot color="var(--text-tertiary)" size={7} /> Add
              </button>
            }
          />
        </div>
      </div>

      {/* Estimate */}
      <div className={ROW}>
        <span className={LABEL}>Estimate</span>
        <SelectMenu
          options={[
            { value: '__none__', label: 'No estimate' },
            ...[1, 2, 3, 5, 8, 13].map((n) => ({
              value: String(n),
              label: `${n} point${n > 1 ? 's' : ''}`,
            })),
          ]}
          value={issue.estimate != null ? String(issue.estimate) : '__none__'}
          onSelect={(v) =>
            patch({ estimate: v === '__none__' ? null : Number(v) })
          }
          searchPlaceholder="Set estimate…"
          trigger={
            <button className={PILL}>
              {issue.estimate != null ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--surface-2)] px-1 text-2xs">
                  {issue.estimate}
                </span>
              ) : (
                <span className="text-[var(--text-secondary)]">None</span>
              )}
            </button>
          }
        />
      </div>

      {/* Project */}
      <div className={ROW}>
        <span className={LABEL}>Project</span>
        <SelectMenu
          options={[
            { value: '__none__', label: 'No project' },
            ...(projects ?? []).map((p) => ({
              value: p.id,
              label: p.name,
              icon: <ColorDot color={p.color ?? 'var(--accent)'} size={9} />,
            })),
          ]}
          value={issue.projectId ?? '__none__'}
          onSelect={(v) =>
            patch({ projectId: v === '__none__' ? null : v })
          }
          searchPlaceholder="Set project…"
          trigger={
            <button className={PILL}>
              {project ? (
                <>
                  <ColorDot color={project.color ?? 'var(--accent)'} size={9} />
                  {project.name}
                </>
              ) : (
                <span className="text-[var(--text-secondary)]">No project</span>
              )}
            </button>
          }
        />
      </div>

      {/* Cycle */}
      <div className={ROW}>
        <span className={LABEL}>Cycle</span>
        <SelectMenu
          options={[
            { value: '__none__', label: 'No cycle' },
            ...(cycles ?? []).map((c) => ({
              value: c.id,
              label: c.name ?? `Cycle ${c.number}`,
            })),
          ]}
          value={issue.cycleId ?? '__none__'}
          onSelect={(v) => patch({ cycleId: v === '__none__' ? null : v })}
          searchPlaceholder="Set cycle…"
          trigger={
            <button className={PILL}>
              {cycle ? (
                <span>{cycle.name ?? `Cycle ${cycle.number}`}</span>
              ) : (
                <span className="text-[var(--text-secondary)]">No cycle</span>
              )}
            </button>
          }
        />
      </div>

      {/* Due date */}
      <div className={ROW}>
        <span className={LABEL}>Due date</span>
        <label className={`${PILL} cursor-pointer relative`}>
          {issue.dueDate ? (
            <span>{formatDate(issue.dueDate)}</span>
          ) : (
            <span className="text-[var(--text-secondary)]">No due date</span>
          )}
          <input
            type="date"
            value={formatDateInput(issue.dueDate)}
            onChange={(e) => patch({ dueDate: dateInputToIso(e.target.value) })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
