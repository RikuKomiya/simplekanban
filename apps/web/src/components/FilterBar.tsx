import type {
  Label,
  PriorityValue,
  WorkflowState,
  WorkspaceMemberWithUser,
} from '@simplekanban/shared';
import { PRIORITY_LABELS } from '@simplekanban/shared';
import { ListFilter } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { Button } from '@/components/ui/Button';
import { StateIcon } from '@/components/icons/StateIcon';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorDot } from '@/components/ui/Chip';
import {
  assigneeOptions,
  labelOptions,
  priorityFromString,
  priorityOptions,
  stateOptions,
} from '@/components/pickers/options';
import { useIssueFilters } from '@/hooks/useIssueFilters';

interface Props {
  states: WorkflowState[];
  members: WorkspaceMemberWithUser[];
  labels: Label[];
}

export function FilterBar({ states, members, labels }: Props) {
  const { search, setFilter, clearAll, activeCount } = useIssueFilters();

  const state = states.find((s) => s.id === search.state);
  const assignee = members.find((m) => m.userId === search.assignee)?.user;
  const label = labels.find((l) => l.id === search.label);
  const priority =
    search.priority != null ? (search.priority as PriorityValue) : undefined;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
      <span className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        <ListFilter size={13} /> Filter
      </span>

      {/* Inline pickers (always visible quick filters) */}
      <SelectMenu
        options={[
          { value: '__none__', label: 'Any status' },
          ...stateOptions(states),
        ]}
        value={search.state ?? '__none__'}
        onSelect={(v) => setFilter('state', v === '__none__' ? undefined : v)}
        trigger={
          <button className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            {state ? (
              <>
                <StateIcon type={state.type} color={state.color} size={13} />
                {state.name}
              </>
            ) : (
              'Status'
            )}
          </button>
        }
      />
      <SelectMenu
        options={[
          { value: '__none__', label: 'Any priority' },
          ...priorityOptions(),
        ]}
        value={search.priority != null ? String(search.priority) : '__none__'}
        onSelect={(v) =>
          setFilter('priority', v === '__none__' ? undefined : priorityFromString(v))
        }
        trigger={
          <button className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            {priority != null ? (
              <>
                <PriorityIcon priority={priority} size={13} />
                {PRIORITY_LABELS[priority]}
              </>
            ) : (
              'Priority'
            )}
          </button>
        }
      />
      <SelectMenu
        options={[
          { value: '__none__', label: 'Anyone' },
          ...assigneeOptions(members.map((m) => m.user), false),
        ]}
        value={search.assignee ?? '__none__'}
        onSelect={(v) => setFilter('assignee', v === '__none__' ? undefined : v)}
        trigger={
          <button className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            {assignee ? (
              <>
                <Avatar id={assignee.id} name={assignee.name || assignee.email} email={assignee.email} image={assignee.image} size={14} />
                {assignee.name || assignee.email}
              </>
            ) : (
              'Assignee'
            )}
          </button>
        }
      />
      <SelectMenu
        options={[{ value: '__none__', label: 'Any label' }, ...labelOptions(labels)]}
        value={search.label ?? '__none__'}
        onSelect={(v) => setFilter('label', v === '__none__' ? undefined : v)}
        trigger={
          <button className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            {label ? (
              <>
                <ColorDot color={label.color} size={8} />
                {label.name}
              </>
            ) : (
              'Label'
            )}
          </button>
        }
      />

      {/* Active filter chips */}
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {state ? (
          <Chip onRemove={() => setFilter('state', undefined)}>
            {state.name}
          </Chip>
        ) : null}
        {priority != null ? (
          <Chip onRemove={() => setFilter('priority', undefined)}>
            {PRIORITY_LABELS[priority]}
          </Chip>
        ) : null}
        {assignee ? (
          <Chip onRemove={() => setFilter('assignee', undefined)}>
            {assignee.name || assignee.email}
          </Chip>
        ) : null}
        {label ? (
          <Chip color={label.color} onRemove={() => setFilter('label', undefined)}>
            {label.name}
          </Chip>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
