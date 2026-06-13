import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  IssueWithRelations,
  PriorityValue,
} from '@simplekanban/shared';
import { formatIdentifier } from '@simplekanban/shared';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorDot } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';

interface Props {
  issue: IssueWithRelations;
  teamKey: string;
  onOpen: (id: string) => void;
  focused?: boolean;
}

/** Shared card body so the drag overlay matches the in-column card exactly. */
function IssueCardContent({
  issue,
  teamKey,
}: {
  issue: IssueWithRelations;
  teamKey: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xs text-[var(--text-tertiary)]">
          {formatIdentifier(teamKey, issue.number)}
        </span>
        <div className="ml-auto">
          <PriorityIcon priority={issue.priority as PriorityValue} size={14} />
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-snug text-[var(--text)]">
        {issue.title}
      </p>

      {issue.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {issue.labels.slice(0, 4).map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-secondary)]"
            >
              <ColorDot color={l.color} size={7} />
              {l.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {issue.estimate != null ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--surface-2)] px-1 text-[10px] text-[var(--text-secondary)]">
            {issue.estimate}
          </span>
        ) : null}
        <div className="ml-auto">
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
      </div>
    </>
  );
}

/** A draggable board card. Pointer-press starts a drag; click opens the peek. */
export function IssueCard({ issue, teamKey, onOpen, focused }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: issue.id,
      data: { type: 'issue', issue },
      transition: { duration: 180, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    // Required for smooth PointerSensor drags on touch devices/trackpads.
    touchAction: 'none' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      data-issue-id={issue.id}
      onClick={() => onOpen(issue.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(issue.id);
      }}
      className={cn(
        'group flex cursor-grab flex-col gap-2 rounded-md border bg-[var(--surface)] p-2.5 text-left shadow-sm',
        'transition-colors duration-100 hover:border-[var(--border-strong)] active:cursor-grabbing',
        focused
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
          : 'border-[var(--border)]',
        // The in-list card becomes the drop slot while the overlay is dragged.
        isDragging && 'border-dashed border-[var(--border-strong)] opacity-40 shadow-none *:invisible',
      )}
    >
      <IssueCardContent issue={issue} teamKey={teamKey} />
    </div>
  );
}

/** Card rendered inside DragOverlay — same content, lifted & slightly tilted. */
export function IssueCardOverlay({
  issue,
  teamKey,
}: {
  issue: IssueWithRelations;
  teamKey: string;
}) {
  return (
    <div className="flex w-[280px] rotate-1 scale-[1.02] cursor-grabbing flex-col gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 shadow-xl shadow-black/30">
      <IssueCardContent issue={issue} teamKey={teamKey} />
    </div>
  );
}
