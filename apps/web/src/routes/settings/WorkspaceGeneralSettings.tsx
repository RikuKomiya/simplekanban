import { useParams } from '@tanstack/react-router';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useThemeStore } from '@/stores/theme';
import { Button } from '@/components/ui/Button';

export function WorkspaceGeneralSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const { theme, toggle } = useThemeStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">General</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Workspace preferences.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] p-4">
        <Row label="Workspace name" value={workspace?.name ?? '—'} />
        <Row label="URL slug" value={workspace?.slug ?? '—'} mono />
        <Row label="Teams" value={String(workspace?.teams.length ?? 0)} />
        <Row label="Members" value={String(workspace?.members.length ?? 0)} />
      </div>

      <div className="flex items-center justify-between rounded-md border border-[var(--border)] p-4">
        <div>
          <p className="text-sm font-medium">Theme</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Currently {theme}.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={toggle}>
          Switch to {theme === 'dark' ? 'light' : 'dark'}
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
    </div>
  );
}
