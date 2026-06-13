import type {
  IssueWithRelations,
  PriorityValue,
} from '@simplekanban/shared';
import { formatIdentifier } from '@simplekanban/shared';
import { CalendarClock } from 'lucide-react';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorDot } from '@/components/ui/Chip';
import { formatDate, isOverdue } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Props {
  issue: IssueWithRelations;
  teamKey: string;
  onOpen: (id: string) => void;
  focused?: boolean;
}

export function IssueRow({ issue, teamKey, onOpen, focused }: Props) {
  return (
    <button
      data-issue-id={issue.id}
      onClick={() => onOpen(issue.id)}
      className={cn(
        'group flex w-full items-center gap-3 px-4 py-1.5 text-left',
        'border-l-2 transition-colors duration-100 hover:bg-[var(--hover)]',
        focused
          ? 'border-l-[var(--accent)] bg-[var(--hover)]'
          : 'border-l-transparent',
      )}
    >
      <PriorityIcon priority={issue.priority as PriorityValue} size={15} />
      <span className="w-16 shrink-0 font-mono text-2xs text-[var(--text-tertiary)]">
        {formatIdentifier(teamKey, issue.number)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>

      <div className="flex shrink-0 items-center gap-2">
        {issue.labels.slice(0, 3).map((l) => (
          <span
            key={l.id}
            className="hidden items-center gap-1 rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-secondary)] sm:inline-flex"
          >
            <ColorDot color={l.color} size={7} />
            {l.name}
          </span>
        ))}
        {issue.dueDate ? (
          <span
            className={cn(
              'hidden items-center gap-1 text-2xs sm:inline-flex',
              isOverdue(issue.dueDate)
                ? 'text-[var(--destructive)]'
                : 'text-[var(--text-tertiary)]',
            )}
          >
            <CalendarClock size={11} />
            {formatDate(issue.dueDate)}
          </span>
        ) : null}
        {issue.estimate != null ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--surface-2)] px-1 text-[10px] text-[var(--text-secondary)]">
            {issue.estimate}
          </span>
        ) : null}
        {issue.assignee ? (
          <Avatar
            id={issue.assignee.id}
            name={issue.assignee.name || issue.assignee.email}
            email={issue.assignee.email}
            image={issue.assignee.image}
            size={18}
          />
        ) : (
          <span className="block h-[18px] w-[18px] rounded-full border border-dashed border-[var(--text-tertiary)]" />
        )}
      </div>
    </button>
  );
}
