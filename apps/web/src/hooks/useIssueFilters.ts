import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { IssueListFilters } from '@simplekanban/shared';

export interface BoardSearch {
  state?: string;
  assignee?: string;
  priority?: number;
  label?: string;
  cycle?: string;
  project?: string;
  q?: string;
}

/** Parse/validate URL search into a typed filter object (used by routes). */
export function validateBoardSearch(
  search: Record<string, unknown>,
): BoardSearch {
  const str = (k: string) =>
    typeof search[k] === 'string' ? (search[k] as string) : undefined;
  const priority =
    search.priority != null && !Number.isNaN(Number(search.priority))
      ? Number(search.priority)
      : undefined;
  return {
    state: str('state'),
    assignee: str('assignee'),
    priority,
    label: str('label'),
    cycle: str('cycle'),
    project: str('project'),
    q: str('q'),
  };
}

/**
 * Reads/writes issue filters from the current route's URL search params.
 * `routeId` scopes the navigate so the active route's other params are kept.
 */
export function useIssueFilters() {
  const search = useSearch({ strict: false }) as BoardSearch;
  const navigate = useNavigate();

  const filters = useMemo<IssueListFilters>(() => {
    const f: IssueListFilters = {};
    if (search.state) f.state = search.state;
    if (search.assignee) f.assignee = search.assignee;
    if (search.priority != null) f.priority = search.priority as never;
    if (search.label) f.label = search.label;
    if (search.cycle) f.cycle = search.cycle;
    if (search.project) f.project = search.project;
    if (search.q) f.q = search.q;
    return f;
  }, [search]);

  const setFilter = (key: keyof BoardSearch, value: string | number | undefined) => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        if (value === undefined || value === '') {
          delete next[key];
        } else {
          next[key] = value;
        }
        return next;
      },
      replace: true,
    });
  };

  const clearAll = () => {
    navigate({ to: '.', search: {}, replace: true });
  };

  const activeCount = Object.values(search).filter(
    (v) => v !== undefined && v !== '',
  ).length;

  return { search, filters, setFilter, clearAll, activeCount };
}
