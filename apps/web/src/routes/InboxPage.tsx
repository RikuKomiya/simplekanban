import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import type { Notification, NotificationType } from '@simplekanban/shared';
import { formatIdentifier } from '@simplekanban/shared';
import { CheckCheck, Inbox as InboxIcon } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { useWorkspace } from '@/hooks/useWorkspace';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const TYPE_LABEL: Record<NotificationType, string> = {
  assigned: 'assigned you',
  comment: 'commented on',
  state_changed: 'changed the status of',
  mention: 'mentioned you in',
};

export function InboxPage() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const { data: workspace } = useWorkspace(ws);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Resolve issue identifiers for the notifications that reference an issue.
  const issueIds = Array.from(
    new Set((notifications ?? []).map((n) => n.issueId).filter(Boolean)),
  ) as string[];

  const issueQueries = useQueries({
    queries: issueIds.map((id) => ({
      queryKey: ['issue', id],
      queryFn: () => api.issues.get(id),
      staleTime: 60_000,
    })),
  });

  const teamById = (teamId: string) =>
    workspace?.teams.find((t) => t.id === teamId);

  const identifierFor = (issueId: string | null): string | null => {
    if (!issueId) return null;
    const q = issueQueries[issueIds.indexOf(issueId)];
    const issue = q?.data;
    if (!issue) return null;
    const team = teamById(issue.teamId);
    return team ? formatIdentifier(team.key, issue.number) : null;
  };

  const memberById = (id: string | null) =>
    id ? workspace?.members.find((m) => m.userId === id)?.user : undefined;

  const onClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const identifier = identifierFor(n.issueId);
    if (identifier) {
      navigate({ to: '/$ws/issue/$identifier', params: { ws, identifier } });
    }
  };

  const unreadCount = (notifications ?? []).filter((n) => !n.readAt).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Inbox"
        icon={<InboxIcon size={15} />}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAll.mutate()}
            >
              <CheckCheck size={14} /> Mark all read
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <SkeletonRows count={6} />
      ) : (notifications?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<InboxIcon size={28} />}
          title="Inbox zero"
          description="You're all caught up. New notifications will appear here."
        />
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60">
          {notifications!.map((n) => {
            const actor = memberById(n.actorId);
            const identifier = identifierFor(n.issueId);
            return (
              <button
                key={n.id}
                onClick={() => onClick(n)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover)]"
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    n.readAt ? 'bg-transparent' : 'bg-[var(--accent)]',
                  )}
                />
                {actor ? (
                  <Avatar
                    id={actor.id}
                    name={actor.name || actor.email}
                    email={actor.email}
                    image={actor.image}
                    size={24}
                  />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-[var(--surface-2)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">
                      {actor?.name || actor?.email || 'Someone'}
                    </span>{' '}
                    <span className="text-[var(--text-secondary)]">
                      {TYPE_LABEL[n.type]}
                    </span>{' '}
                    {identifier ? (
                      <span className="font-mono text-2xs text-[var(--text-tertiary)]">
                        {identifier}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">an issue</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-2xs text-[var(--text-tertiary)]">
                  {formatRelative(n.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
