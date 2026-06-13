import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  IssueWithRelations,
  WorkflowState,
} from '@simplekanban/shared';
import { Plus } from 'lucide-react';
import { StateIcon } from '@/components/icons/StateIcon';
import { IssueCard } from './IssueCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

interface Props {
  state: WorkflowState;
  issues: IssueWithRelations[];
  teamKey: string;
  onOpenIssue: (id: string) => void;
  onAddIssue: (stateId: string) => void;
  focusedIssueId?: string | null;
  isDraggingAny?: boolean;
}

export function BoardColumn({
  state,
  issues,
  teamKey,
  onOpenIssue,
  onAddIssue,
  focusedIssueId,
  isDraggingAny,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${state.id}`,
    data: { type: 'column', stateId: state.id },
  });

  return (
    <div className="flex max-h-full w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <StateIcon type={state.type} color={state.color} size={15} />
        <span className="text-sm font-medium">{state.name}</span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {issues.length}
        </span>
        <Tooltip content="Add issue">
          <button
            onClick={() => onAddIssue(state.id)}
            className="ml-auto rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Drop area — its own scroll container so long columns stay usable
          and auto-scroll works while dragging. */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-md p-1 transition-colors duration-100',
          isOver && issues.length === 0 && 'bg-[var(--hover)]/50',
        )}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              teamKey={teamKey}
              onOpen={onOpenIssue}
              focused={focusedIssueId === issue.id}
            />
          ))}
        </SortableContext>
        {issues.length === 0 ? (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-2xs transition-colors duration-100',
              isOver
                ? 'border-[var(--accent)]/60 text-[var(--text-secondary)]'
                : 'border-[var(--border)] text-[var(--text-tertiary)]',
            )}
          >
            {isDraggingAny ? 'Drop here' : 'No issues'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
