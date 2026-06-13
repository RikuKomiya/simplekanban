import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  CircleUser,
  Folders,
  Inbox,
  LayoutGrid,
  List,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import { formatIdentifier, type PriorityValue } from '@simplekanban/shared';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { useUiStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDebounced } from '@/hooks/useDebounced';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { PriorityIcon } from '@/components/icons/PriorityIcon';

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const openNewIssue = useUiStore((s) => s.openNewIssue);
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const navigate = useNavigate();
  const { data: workspace } = useWorkspace(ws);
  const { theme, toggle } = useThemeStore();

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim(), 220);

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  // Issue search — only fires for non-empty queries.
  const { data: results, isFetching } = useQuery({
    queryKey: qk.search(ws ?? '', debounced),
    queryFn: () => api.search(ws!, debounced),
    enabled: open && !!ws && debounced.length >= 1,
    staleTime: 10_000,
  });

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const teams = workspace?.teams ?? [];
  const firstTeamKey = teams[0]?.key;
  const teamByNumber = (teamId: string) => teams.find((t) => t.id === teamId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[12%] max-w-xl overflow-hidden p-0"
        ariaLabel="Command palette"
      >
        <Command
          shouldFilter={debounced.length === 0}
          className="flex flex-col"
          loop
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
            <Search size={15} className="text-[var(--text-tertiary)]" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Search issues or type a command…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-xs text-[var(--text-tertiary)]">
              {isFetching ? 'Searching…' : 'No results found.'}
            </Command.Empty>

            {/* Issue search results */}
            {debounced.length >= 1 && results && results.length > 0 ? (
              <Command.Group
                heading="Issues"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
              >
                {results.map((issue) => {
                  const team = teamByNumber(issue.teamId);
                  const identifier = team
                    ? formatIdentifier(team.key, issue.number)
                    : `#${issue.number}`;
                  return (
                    <Command.Item
                      key={issue.id}
                      value={`${identifier} ${issue.title}`}
                      onSelect={() =>
                        go(() => {
                          if (ws && team)
                            navigate({
                              to: '/$ws/issue/$identifier',
                              params: { ws, identifier },
                            });
                        })
                      }
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-sm data-[selected=true]:bg-[var(--hover)] cursor-pointer"
                    >
                      <PriorityIcon
                        priority={issue.priority as PriorityValue}
                        size={14}
                      />
                      <span className="font-mono text-2xs text-[var(--text-tertiary)] w-14 shrink-0">
                        {identifier}
                      </span>
                      <span className="truncate">{issue.title}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Command/navigation mode (when search is empty) */}
            {debounced.length === 0 && ws ? (
              <>
                <Command.Group
                  heading="Create"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
                >
                  <PItem
                    icon={<Plus size={15} />}
                    label="New issue"
                    onSelect={() => go(() => openNewIssue())}
                  />
                </Command.Group>

                <Command.Group
                  heading="Navigate"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
                >
                  {firstTeamKey ? (
                    <>
                      <PItem
                        icon={<LayoutGrid size={15} />}
                        label="Go to board"
                        onSelect={() =>
                          go(() =>
                            navigate({
                              to: '/$ws/team/$teamKey/board',
                              params: { ws, teamKey: firstTeamKey },
                            }),
                          )
                        }
                      />
                      <PItem
                        icon={<List size={15} />}
                        label="Go to list"
                        onSelect={() =>
                          go(() =>
                            navigate({
                              to: '/$ws/team/$teamKey/issues',
                              params: { ws, teamKey: firstTeamKey },
                            }),
                          )
                        }
                      />
                    </>
                  ) : null}
                  <PItem
                    icon={<Inbox size={15} />}
                    label="Go to inbox"
                    onSelect={() =>
                      go(() => navigate({ to: '/$ws/inbox', params: { ws } }))
                    }
                  />
                  <PItem
                    icon={<CircleUser size={15} />}
                    label="Go to my issues"
                    onSelect={() =>
                      go(() => navigate({ to: '/$ws/my-issues', params: { ws } }))
                    }
                  />
                  <PItem
                    icon={<Folders size={15} />}
                    label="Go to projects"
                    onSelect={() =>
                      go(() => navigate({ to: '/$ws/projects', params: { ws } }))
                    }
                  />
                </Command.Group>

                <Command.Group
                  heading="Preferences"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
                >
                  <PItem
                    icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    onSelect={() => go(toggle)}
                  />
                </Command.Group>
              </>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-sm data-[selected=true]:bg-[var(--hover)] cursor-pointer"
    >
      <span className="text-[var(--text-secondary)]">{icon}</span>
      {label}
    </Command.Item>
  );
}
