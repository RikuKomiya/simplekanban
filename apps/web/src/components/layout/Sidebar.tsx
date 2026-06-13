import { Link, useParams, useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  Inbox,
  CircleUser,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Settings,
  Star,
  Folders,
} from 'lucide-react';
import { useMe, useWorkspace } from '@/hooks/useWorkspace';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useUiStore } from '@/stores/ui';
import { useFavoritesStore } from '@/stores/favorites';
import { useThemeStore } from '@/stores/theme';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/Menu';
import { StateIcon } from '@/components/icons/StateIcon';

function NavItem({
  to,
  params,
  icon,
  label,
  badge,
  exact,
}: {
  to: string;
  params?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={{ exact: exact ?? false }}
      className={cn(
        'group flex h-7 items-center gap-2 rounded-[var(--radius)] px-2 text-sm text-[var(--text-secondary)]',
        'hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors duration-100',
      )}
      activeProps={{
        className: 'bg-[var(--hover)] text-[var(--text)] font-medium',
      }}
    >
      <span className="flex h-4 w-4 items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-medium text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </div>
  );
}

export function Sidebar() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: workspace } = useWorkspace(ws);
  const unread = useUnreadCount();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const { data: session } = useSession();
  const user = session?.user;

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center gap-2 border-r border-[var(--border)] bg-[var(--bg)] py-3">
        <Tooltip content="Expand sidebar" side="right">
          <button
            onClick={toggleSidebar}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <PanelLeft size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Inbox" side="right">
          <Link
            to="/$ws/inbox"
            params={{ ws }}
            className="relative rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <Inbox size={16} />
            {unread > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            ) : null}
          </Link>
        </Tooltip>
        <Tooltip content="My issues" side="right">
          <Link
            to="/$ws/my-issues"
            params={{ ws }}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <CircleUser size={16} />
          </Link>
        </Tooltip>
        <Tooltip content="Projects" side="right">
          <Link
            to="/$ws/projects"
            params={{ ws }}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <Folders size={16} />
          </Link>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]">
      {/* Workspace switcher */}
      <div className="flex items-center gap-1 px-2 py-2">
        <Menu>
          <MenuTrigger asChild>
            <button className="flex flex-1 items-center gap-2 rounded-[var(--radius)] px-1.5 py-1 text-left hover:bg-[var(--hover)]">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-2xs font-bold text-white">
                {(workspace?.name ?? ws)[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm font-medium">
                {workspace?.name ?? ws}
              </span>
              <ChevronDown size={14} className="text-[var(--text-secondary)]" />
            </button>
          </MenuTrigger>
          <MenuContent align="start" className="min-w-[220px]">
            <MenuLabel>Workspaces</MenuLabel>
            {me?.workspaces.map((w) => (
              <MenuItem
                key={w.id}
                onSelect={() =>
                  navigate({ to: '/$ws', params: { ws: w.id } })
                }
              >
                <div className="flex h-4 w-4 items-center justify-center rounded bg-[var(--accent)] text-[9px] font-bold text-white">
                  {w.name[0]?.toUpperCase()}
                </div>
                <span className="flex-1 truncate">{w.name}</span>
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onSelect={() => navigate({ to: '/onboarding' })}>
              <Plus size={14} /> New workspace
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={toggleTheme}>Toggle theme</MenuItem>
            <MenuItem
              destructive
              onSelect={async () => {
                await signOut();
                navigate({ to: '/login', search: {} });
              }}
            >
              Sign out
            </MenuItem>
          </MenuContent>
        </Menu>
        <Tooltip content="Collapse sidebar" side="bottom">
          <button
            onClick={toggleSidebar}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <PanelLeftClose size={15} />
          </button>
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="flex flex-col gap-0.5">
          <NavItem
            to="/$ws/inbox"
            params={{ ws }}
            icon={<Inbox size={15} />}
            label="Inbox"
            badge={unread}
          />
          <NavItem
            to="/$ws/my-issues"
            params={{ ws }}
            icon={<CircleUser size={15} />}
            label="My Issues"
          />
          <NavItem
            to="/$ws/projects"
            params={{ ws }}
            icon={<Folders size={15} />}
            label="Projects"
          />
        </div>

        {favorites.length > 0 ? (
          <>
            <SectionLabel>Favorites</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {favorites.map((f) => (
                <Link
                  key={f.entityType + f.entityId}
                  to={f.href}
                  className="group flex h-7 items-center gap-2 rounded-[var(--radius)] px-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                >
                  <Star
                    size={13}
                    className="fill-[var(--warning)] text-[var(--warning)]"
                  />
                  <span className="flex-1 truncate">{f.label}</span>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        <SectionLabel>Teams</SectionLabel>
        <div className="flex flex-col gap-1">
          {workspace?.teams.map((team) => (
            <div key={team.id}>
              <div className="flex h-7 items-center gap-2 rounded-[var(--radius)] px-2 text-sm font-medium">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: team.color ?? 'var(--accent)' }}
                >
                  {team.key.slice(0, 2)}
                </span>
                <span className="flex-1 truncate text-[var(--text)]">
                  {team.name}
                </span>
              </div>
              <div className="ml-3.5 flex flex-col gap-0.5 border-l border-[var(--border)] pl-2.5">
                <NavItem
                  to="/$ws/team/$teamKey/board"
                  params={{ ws, teamKey: team.key }}
                  icon={
                    <StateIcon type="started" color="var(--text-secondary)" size={13} />
                  }
                  label="Board"
                />
                <NavItem
                  to="/$ws/team/$teamKey/issues"
                  params={{ ws, teamKey: team.key }}
                  icon={<Layers size={13} />}
                  label="Issues"
                />
                <NavItem
                  to="/$ws/team/$teamKey/cycles"
                  params={{ ws, teamKey: team.key }}
                  icon={
                    <StateIcon type="backlog" color="var(--text-secondary)" size={13} />
                  }
                  label="Cycles"
                />
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--border)] p-2">
        <Menu>
          <MenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-[var(--radius)] px-1.5 py-1 text-left hover:bg-[var(--hover)]">
              {user ? (
                <Avatar
                  id={user.id}
                  name={user.name ?? user.email}
                  email={user.email}
                  image={user.image}
                  size={20}
                />
              ) : (
                <CircleUser size={18} />
              )}
              <span className="flex-1 truncate text-sm">
                {user?.name ?? user?.email ?? 'Account'}
              </span>
            </button>
          </MenuTrigger>
          <MenuContent align="start" side="top">
            <Link to="/$ws/settings" params={{ ws }}>
              <MenuItem>
                <Settings size={14} /> Settings
              </MenuItem>
            </Link>
            <MenuItem onSelect={toggleTheme}>Toggle theme</MenuItem>
            <MenuSeparator />
            <MenuItem
              destructive
              onSelect={async () => {
                await signOut();
                navigate({ to: '/login', search: {} });
              }}
            >
              Sign out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </aside>
  );
}
