import { useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import type { IssueDetail } from '@simplekanban/shared';
import { formatIdentifier } from '@simplekanban/shared';
import { Copy, Eye, Link2, Pencil, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/Input';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUpdateIssue } from '@/hooks/useIssue';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFavoritesStore } from '@/stores/favorites';
import { cn } from '@/lib/cn';
import { Markdown } from './Markdown';
import { IssueProperties } from './IssueProperties';
import { IssueComments } from './IssueComments';
import { IssueActivityTimeline } from './IssueActivity';
import { SubIssues } from './SubIssues';

export function IssueDetailView({
  issue,
  layout = 'full',
}: {
  issue: IssueDetail;
  layout?: 'full' | 'peek';
}) {
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const { data: workspace } = useWorkspace(ws);
  const team = workspace?.teams.find((t) => t.id === issue.teamId);
  const identifier = team ? formatIdentifier(team.key, issue.number) : `#${issue.number}`;

  const updateIssue = useUpdateIssue();
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const favored = isFavorite('issue', issue.id);

  // Title inline edit
  const [title, setTitle] = useState(issue.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setTitle(issue.title), [issue.id, issue.title]);

  const saveTitle = () => {
    const next = title.trim();
    if (next && next !== issue.title) {
      updateIssue.mutate({ id: issue.id, patch: { title: next } });
    } else {
      setTitle(issue.title);
    }
  };

  // Description edit/preview
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(issue.description ?? '');
  useEffect(() => setDesc(issue.description ?? ''), [issue.id, issue.description]);

  const saveDesc = () => {
    const next = desc.trim();
    if (next !== (issue.description ?? '')) {
      updateIssue.mutate({
        id: issue.id,
        patch: { description: next || null },
      });
    }
    setEditingDesc(false);
  };

  const copyId = () => {
    navigator.clipboard.writeText(identifier);
    toast.success('Copied identifier');
  };
  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Copied URL');
  };

  const main = (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[var(--text-tertiary)]">
          {identifier}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Copy identifier">
            <button
              onClick={copyId}
              className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <Copy size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Copy link">
            <button
              onClick={copyUrl}
              className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <Link2 size={14} />
            </button>
          </Tooltip>
          <Tooltip content={favored ? 'Remove favorite' : 'Add favorite'}>
            <button
              onClick={() =>
                toggleFavorite({
                  entityType: 'issue',
                  entityId: issue.id,
                  label: `${identifier} ${issue.title}`,
                  href: ws
                    ? `/${ws}/issue/${identifier}`
                    : `/issue/${identifier}`,
                })
              }
              className={cn(
                'rounded p-1.5 hover:bg-[var(--hover)]',
                favored
                  ? 'text-[var(--warning)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
              )}
            >
              <Star
                size={14}
                className={favored ? 'fill-[var(--warning)]' : ''}
              />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Title */}
      <textarea
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          if (e.key === 'Escape') {
            setTitle(issue.title);
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        rows={1}
        className="w-full resize-none bg-transparent text-xl font-semibold leading-snug outline-none placeholder:text-[var(--text-tertiary)]"
        placeholder="Issue title"
      />

      {/* Description */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Description
          </h3>
          <button
            onClick={() => (editingDesc ? saveDesc() : setEditingDesc(true))}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            {editingDesc ? (
              <>
                <Eye size={12} /> Preview
              </>
            ) : (
              <>
                <Pencil size={12} /> Edit
              </>
            )}
          </button>
        </div>
        {editingDesc ? (
          <Textarea
            autoFocus
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                saveDesc();
              }
            }}
            rows={6}
            placeholder="Add a description… (markdown supported)"
          />
        ) : (
          <button
            onClick={() => setEditingDesc(true)}
            className="block w-full rounded-[var(--radius)] px-1 py-1 text-left text-sm hover:bg-[var(--hover)]"
          >
            <Markdown source={issue.description ?? ''} />
          </button>
        )}
      </div>

      <SubIssues issue={issue} />

      <div className="h-px bg-[var(--border)]" />

      <IssueComments issueId={issue.id} comments={issue.comments} />

      <IssueActivityTimeline activities={issue.activities} />
    </div>
  );

  if (layout === 'peek') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-[var(--border)] p-4">
          <IssueProperties issue={issue} />
        </div>
        <div className="p-4">{main}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-8 px-8 py-8">
      <div className="min-w-0 flex-1">{main}</div>
      <aside className="w-64 shrink-0 border-l border-[var(--border)] pl-6">
        <IssueProperties issue={issue} />
      </aside>
    </div>
  );
}
