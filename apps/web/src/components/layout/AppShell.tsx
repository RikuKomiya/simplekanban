import { useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { NewIssueModal } from '@/components/NewIssueModal';
import { CommandPalette } from '@/components/command/CommandPalette';
import { ShortcutsDialog } from '@/components/ShortcutsDialog';
import { IssuePeekPanel } from '@/components/issue/IssuePeekPanel';
import { useUiStore } from '@/stores/ui';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useRealtime } from '@/hooks/useRealtime';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import { useNavContext } from '@/lib/navContext';

/**
 * The authenticated app frame: persistent sidebar + the page Outlet, plus all
 * global overlays (command palette, new-issue modal, shortcuts help, issue peek)
 * and the realtime + keyboard-shortcut wiring.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const navigate = useNavigate();
  const { data: workspace } = useWorkspace(ws);

  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const openNewIssue = useUiStore((s) => s.openNewIssue);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const closePeek = useUiStore((s) => s.closePeek);
  const peekIssueId = useUiStore((s) => s.peekIssueId);
  const setNav = useNavContext((s) => s.set);

  // Subscribe to realtime once we know the workspace id.
  useRealtime(workspace?.id);

  // Keep nav context in sync for global handlers.
  useEffect(() => {
    setNav({ ws: ws ?? null, workspaceId: workspace?.id ?? null });
  }, [ws, workspace?.id, setNav]);

  const firstTeamKey = workspace?.teams[0]?.key;

  useKeyboardShortcuts(
    {
      'mod+k': () => setPaletteOpen(true),
      c: () => openNewIssue(),
      '?': () => setShortcutsOpen(true),
      escape: () => {
        if (peekIssueId) closePeek();
      },
    },
    {
      g: {
        b: () =>
          ws && firstTeamKey &&
          navigate({
            to: '/$ws/team/$teamKey/board',
            params: { ws, teamKey: firstTeamKey },
          }),
        l: () =>
          ws && firstTeamKey &&
          navigate({
            to: '/$ws/team/$teamKey/issues',
            params: { ws, teamKey: firstTeamKey },
          }),
        i: () => ws && navigate({ to: '/$ws/inbox', params: { ws } }),
        m: () => ws && navigate({ to: '/$ws/my-issues', params: { ws } }),
        p: () => ws && navigate({ to: '/$ws/projects', params: { ws } }),
      },
    },
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {/* Global overlays */}
      <CommandPalette />
      <NewIssueModal />
      <ShortcutsDialog />
      <IssuePeekPanel />
    </div>
  );
}
