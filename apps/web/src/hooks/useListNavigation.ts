import { useEffect, useRef, useState } from 'react';
import { isEditableTarget } from './useKeyboard';

/**
 * Arrow/jk navigation over a flat list of issue ids. Enter opens the focused
 * issue. The focused id is reflected back so the row/card can highlight. Also
 * scrolls the focused element into view. `x` toggles a selection set.
 *
 * Property pop-ups (s/a/p/l) are surfaced via `onAction` so the consuming view
 * can route them to the right picker. Editable targets never trigger nav.
 */
export function useListNavigation(
  ids: string[],
  onOpen: (id: string) => void,
  scopeKey?: string,
  onAction?: (action: 'status' | 'assignee' | 'priority' | 'label', id: string) => void,
) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const idsRef = useRef(ids);
  idsRef.current = ids;

  // Reset focus when the scope (team/view) changes.
  useEffect(() => {
    setFocusedId(null);
    setSelected(new Set());
  }, [scopeKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const list = idsRef.current;
      if (list.length === 0) return;

      const currentIndex = focusedId ? list.indexOf(focusedId) : -1;

      const move = (delta: number) => {
        e.preventDefault();
        const nextIndex =
          currentIndex < 0
            ? delta > 0
              ? 0
              : list.length - 1
            : Math.min(list.length - 1, Math.max(0, currentIndex + delta));
        const nextId = list[nextIndex];
        if (nextId) {
          setFocusedId(nextId);
          scrollIntoView(nextId);
        }
      };

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          move(1);
          break;
        case 'ArrowUp':
        case 'k':
          move(-1);
          break;
        case 'Enter':
          if (focusedId) {
            e.preventDefault();
            onOpen(focusedId);
          }
          break;
        case 'x':
          if (focusedId) {
            e.preventDefault();
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(focusedId)) next.delete(focusedId);
              else next.add(focusedId);
              return next;
            });
          }
          break;
        case 's':
          if (focusedId && onAction) {
            e.preventDefault();
            onAction('status', focusedId);
          }
          break;
        case 'a':
          if (focusedId && onAction) {
            e.preventDefault();
            onAction('assignee', focusedId);
          }
          break;
        case 'p':
          if (focusedId && onAction) {
            e.preventDefault();
            onAction('priority', focusedId);
          }
          break;
        case 'l':
          if (focusedId && onAction) {
            e.preventDefault();
            onAction('label', focusedId);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedId, onOpen, onAction]);

  return { focusedId, setFocusedId, selected };
}

function scrollIntoView(id: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-issue-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
