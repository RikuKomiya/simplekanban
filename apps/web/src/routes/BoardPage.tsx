import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  closestCorners,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import {
  sortOrderBetween,
  type IssueWithRelations,
} from '@simplekanban/shared';
import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTeamByKey, useWorkspace } from '@/hooks/useWorkspace';
import { useStates, useIssues } from '@/hooks/useTeamData';
import { useUpdateIssue } from '@/hooks/useIssue';
import { useIssueFilters } from '@/hooks/useIssueFilters';
import { useUiStore } from '@/stores/ui';
import { qk } from '@/lib/queryKeys';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/FilterBar';
import { BoardColumn } from '@/components/board/BoardColumn';
import { IssueCardOverlay } from '@/components/board/IssueCard';
import { SkeletonBoard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useListNavigation } from '@/hooks/useListNavigation';

const COLUMN_PREFIX = 'column:';

const dropAnimation: DropAnimation = {
  duration: 180,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
};

export function BoardPage() {
  const { ws, teamKey } = useParams({ strict: false }) as {
    ws: string;
    teamKey: string;
  };
  const qc = useQueryClient();
  const team = useTeamByKey(ws, teamKey);
  const { data: workspace } = useWorkspace(ws);
  const { data: states, isLoading: statesLoading } = useStates(team?.id);
  const { filters } = useIssueFilters();
  const { data: issues, isLoading: issuesLoading } = useIssues(team?.id, filters);
  const updateIssue = useUpdateIssue();
  const openPeek = useUiStore((s) => s.openPeek);
  const openNewIssue = useUiStore((s) => s.openNewIssue);

  const [activeId, setActiveId] = useState<string | null>(null);
  // While a drag is in flight the board renders from this override
  // (stateId → ordered issue ids) so cards part to make room live.
  const [override, setOverride] = useState<Map<string, string[]> | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Group issues by state, ordered by sortOrder.
  const grouped = useMemo(() => {
    const map = new Map<string, IssueWithRelations[]>();
    (states ?? []).forEach((s) => map.set(s.id, []));
    (issues ?? []).forEach((i) => {
      if (!map.has(i.stateId)) map.set(i.stateId, []);
      map.get(i.stateId)!.push(i);
    });
    map.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [states, issues]);

  // What the columns actually render: the live drag override when present.
  const displayed = useMemo(() => {
    if (!override) return grouped;
    const lookup = new Map((issues ?? []).map((i) => [i.id, i]));
    const map = new Map<string, IssueWithRelations[]>();
    override.forEach((ids, stateId) => {
      map.set(
        stateId,
        ids
          .map((id) => lookup.get(id))
          .filter((i): i is IssueWithRelations => i !== undefined),
      );
    });
    return map;
  }, [grouped, override, issues]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [displayed]);

  // Keyboard list nav over the flattened, column-major order.
  const flatIds = useMemo(
    () => (states ?? []).flatMap((s) => (displayed.get(s.id) ?? []).map((i) => i.id)),
    [states, displayed],
  );
  const { focusedId } = useListNavigation(flatIds, (id) => openPeek(id), team?.id);

  const activeIssue = (issues ?? []).find((i) => i.id === activeId);

  const findContainer = useCallback(
    (id: UniqueIdentifier): string | undefined => {
      const idStr = String(id);
      if (idStr.startsWith(COLUMN_PREFIX)) return idStr.slice(COLUMN_PREFIX.length);
      const source = override ?? null;
      if (source) {
        for (const [stateId, ids] of source) {
          if (ids.includes(idStr)) return stateId;
        }
        return undefined;
      }
      for (const [stateId, list] of grouped) {
        if (list.some((i) => i.id === idStr)) return stateId;
      }
      return undefined;
    },
    [override, grouped],
  );

  // Multi-container collision detection (canonical dnd-kit pattern):
  // pointer hits first, then rect intersection; when hovering a column that
  // has cards, re-route to the closest card so insertion stays precise.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!activeId) return closestCorners(args);

      const pointerCollisions = pointerWithin(args);
      const collisions =
        pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
      let overId = getFirstCollision(collisions, 'id');

      if (overId != null) {
        const overIdStr = String(overId);
        if (overIdStr.startsWith(COLUMN_PREFIX)) {
          const stateId = overIdStr.slice(COLUMN_PREFIX.length);
          const items = (displayed.get(stateId) ?? []).filter(
            (i) => i.id !== activeId,
          );
          if (items.length > 0) {
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (c) =>
                  String(c.id) !== overIdStr &&
                  items.some((i) => i.id === String(c.id)),
              ),
            });
            overId = closest[0]?.id ?? overId;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Keep the previous target briefly when crossing container boundaries
      // so the preview doesn't flicker back.
      if (recentlyMovedToNewContainer.current) lastOverId.current = activeId;
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, displayed],
  );

  const resetDrag = () => {
    setActiveId(null);
    setOverride(null);
    lastOverId.current = null;
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverride(
      new Map([...grouped].map(([stateId, list]) => [stateId, list.map((i) => i.id)])),
    );
  };

  // Live preview: move the dragged card between columns while hovering.
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeContainer = findContainer(activeIdStr);
    const overContainer = findContainer(overIdStr);
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setOverride((prev) => {
      if (!prev) return prev;
      const next = new Map([...prev].map(([k, v]) => [k, [...v]]));
      const fromIds = next.get(activeContainer);
      const toIds = next.get(overContainer) ?? [];
      if (!fromIds) return prev;

      const overIndex = toIds.indexOf(overIdStr);
      const isBelowOverItem =
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;
      const newIndex =
        overIndex >= 0 ? overIndex + (isBelowOverItem ? 1 : 0) : toIds.length;

      fromIds.splice(fromIds.indexOf(activeIdStr), 1);
      toIds.splice(newIndex, 0, activeIdStr);
      next.set(overContainer, toIds);
      recentlyMovedToNewContainer.current = true;
      return next;
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || !team || !override) {
      resetDrag();
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const dragged = (issues ?? []).find((i) => i.id === activeIdStr);
    const container = findContainer(activeIdStr);
    if (!dragged || !container) {
      resetDrag();
      return;
    }

    // Final in-column position (same-container sorts resolve here).
    const ids = override.get(container) ?? [];
    const activeIndex = ids.indexOf(activeIdStr);
    const overIndex = overIdStr.startsWith(COLUMN_PREFIX)
      ? ids.length - 1
      : ids.indexOf(overIdStr);
    const finalIds =
      activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex
        ? arrayMove(ids, activeIndex, overIndex)
        : ids;

    const stateChanged = container !== dragged.stateId;
    const originalIds = (grouped.get(dragged.stateId) ?? []).map((i) => i.id);
    if (!stateChanged && finalIds.join() === originalIds.join()) {
      resetDrag();
      return;
    }

    const lookup = new Map((issues ?? []).map((i) => [i.id, i]));
    const pos = finalIds.indexOf(activeIdStr);
    const before = pos > 0 ? lookup.get(finalIds[pos - 1]!) : undefined;
    const after =
      pos < finalIds.length - 1 ? lookup.get(finalIds[pos + 1]!) : undefined;
    const newSortOrder = sortOrderBetween(before?.sortOrder, after?.sortOrder);

    // Optimistic cache update across all matching issue-list caches, applied
    // in the same render as the override reset so nothing flickers.
    const snapshots = qc.getQueriesData<IssueWithRelations[]>({
      queryKey: ['issues', team.id],
    });
    snapshots.forEach(([key, list]) => {
      if (!Array.isArray(list)) return;
      qc.setQueryData<IssueWithRelations[]>(
        key,
        list.map((i) =>
          i.id === activeIdStr
            ? { ...i, stateId: container, sortOrder: newSortOrder }
            : i,
        ),
      );
    });
    resetDrag();

    updateIssue.mutate(
      {
        id: activeIdStr,
        patch: { stateId: container, sortOrder: newSortOrder },
      },
      {
        onError: () => {
          qc.invalidateQueries({ queryKey: qk.issuesAll(team.id) });
        },
      },
    );
  };

  if (!team) {
    return <EmptyState title="Team not found" />;
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={team.name}
        tabs={
          <>
            <Link
              to="/$ws/team/$teamKey/board"
              params={{ ws, teamKey }}
              className="flex h-7 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--hover)] px-2 text-xs font-medium"
            >
              <LayoutGrid size={13} /> Board
            </Link>
            <Link
              to="/$ws/team/$teamKey/issues"
              params={{ ws, teamKey }}
              className="flex h-7 items-center gap-1.5 rounded-[var(--radius)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <ListIcon size={13} /> List
            </Link>
          </>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewIssue({ teamId: team.id })}
          >
            <Plus size={14} /> New issue
          </Button>
        }
      />

      <FilterBar
        states={states ?? []}
        members={workspace?.members ?? []}
        labels={workspace?.labels ?? []}
      />

      {statesLoading || issuesLoading ? (
        <SkeletonBoard />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={resetDrag}
        >
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
            {(states ?? []).map((state) => (
              <BoardColumn
                key={state.id}
                state={state}
                issues={displayed.get(state.id) ?? []}
                teamKey={team.key}
                onOpenIssue={openPeek}
                onAddIssue={(stateId) =>
                  openNewIssue({ teamId: team.id, stateId })
                }
                focusedIssueId={focusedId}
                isDraggingAny={activeId !== null}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeIssue ? (
              <IssueCardOverlay issue={activeIssue} teamKey={team.key} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
