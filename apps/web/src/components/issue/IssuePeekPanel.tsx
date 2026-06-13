import { useNavigate, useParams } from '@tanstack/react-router';
import { ExternalLink, X } from 'lucide-react';
import { formatIdentifier } from '@simplekanban/shared';
import { useUiStore } from '@/stores/ui';
import { useIssueDetail } from '@/hooks/useIssue';
import { useWorkspace } from '@/hooks/useWorkspace';
import { IssueDetailView } from './IssueDetailView';
import { Spinner } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * Right-hand slide-over panel showing the full issue detail, opened from the
 * board/list. ESC or clicking the backdrop closes it.
 */
export function IssuePeekPanel() {
  const peekId = useUiStore((s) => s.peekIssueId);
  const closePeek = useUiStore((s) => s.closePeek);
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const navigate = useNavigate();
  const { data: issue, isLoading } = useIssueDetail(peekId ?? undefined);
  const { data: workspace } = useWorkspace(ws);

  if (!peekId) return null;

  const team = issue
    ? workspace?.teams.find((t) => t.id === issue.teamId)
    : undefined;
  const identifier =
    issue && team ? formatIdentifier(team.key, issue.number) : '';

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/30 animate-overlay"
        onClick={closePeek}
        aria-hidden
      />
      <div
        className="fixed right-0 top-0 z-40 flex h-dvh w-[min(560px,92vw)] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-slide-panel"
        role="dialog"
        aria-label="Issue detail"
      >
        <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2">
          <Tooltip content="Close">
            <button
              onClick={closePeek}
              className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <X size={15} />
            </button>
          </Tooltip>
          <span className="font-mono text-2xs text-[var(--text-tertiary)]">
            {identifier}
          </span>
          {issue && team && ws ? (
            <Tooltip content="Open full page">
              <button
                onClick={() => {
                  closePeek();
                  navigate({
                    to: '/$ws/issue/$identifier',
                    params: { ws, identifier },
                  });
                }}
                className="ml-auto rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
              >
                <ExternalLink size={14} />
              </button>
            </Tooltip>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading || !issue ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <IssueDetailView issue={issue} layout="peek" />
          )}
        </div>
      </div>
    </>
  );
}
