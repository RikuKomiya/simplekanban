import type {
  Label,
  PriorityValue,
  UserSummary,
  WorkflowState,
} from '@simplekanban/shared';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@simplekanban/shared';
import type { SelectOption } from '@/components/ui/SelectMenu';
import { StateIcon } from '@/components/icons/StateIcon';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorDot } from '@/components/ui/Chip';

export function stateOptions(states: WorkflowState[]): SelectOption[] {
  return states.map((s) => ({
    value: s.id,
    label: s.name,
    keywords: s.type,
    icon: <StateIcon type={s.type} color={s.color} size={15} />,
  }));
}

export function priorityOptions(): SelectOption[] {
  return PRIORITY_ORDER.map((p) => ({
    value: String(p),
    label: PRIORITY_LABELS[p],
    icon: <PriorityIcon priority={p} size={15} />,
  }));
}

export function assigneeOptions(
  users: UserSummary[],
  includeUnassigned = true,
): SelectOption[] {
  const opts: SelectOption[] = users.map((u) => ({
    value: u.id,
    label: u.name || u.email,
    keywords: u.email,
    icon: (
      <Avatar id={u.id} name={u.name || u.email} email={u.email} image={u.image} size={16} />
    ),
  }));
  if (includeUnassigned) {
    opts.unshift({
      value: '__none__',
      label: 'No assignee',
      icon: <span className="block h-3.5 w-3.5 rounded-full border border-dashed border-[var(--text-tertiary)]" />,
    });
  }
  return opts;
}

export function labelOptions(labels: Label[]): SelectOption[] {
  return labels.map((l) => ({
    value: l.id,
    label: l.name,
    icon: <ColorDot color={l.color} size={10} />,
  }));
}

export function priorityFromString(v: string): PriorityValue {
  const n = Number(v);
  return (n >= 0 && n <= 4 ? n : 0) as PriorityValue;
}
