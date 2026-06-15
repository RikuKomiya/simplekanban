import { Link, Outlet, useParams } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/$ws/settings', label: 'General', exact: true },
  { to: '/$ws/settings/teams', label: 'Teams', exact: false },
  { to: '/$ws/settings/statuses', label: 'Statuses', exact: false },
  { to: '/$ws/settings/members', label: 'Members', exact: false },
  { to: '/$ws/settings/labels', label: 'Labels', exact: false },
  { to: '/$ws/settings/api-keys', label: 'API keys', exact: false },
] as const;

export function SettingsLayout() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" icon={<Settings size={15} />} />
      <div className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 border-r border-[var(--border)] p-3">
          <div className="flex flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                params={{ ws }}
                activeOptions={{ exact: item.exact }}
                className={cn(
                  'rounded-[var(--radius)] px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
                )}
                activeProps={{
                  className: 'bg-[var(--hover)] text-[var(--text)] font-medium',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
