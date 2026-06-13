import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { Issue, IssueDetail } from '@simplekanban/shared';
import { formatIdentifier, type PriorityValue } from '@simplekanban/shared';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCreateIssue } from '@/hooks/useCreateIssue';

export function SubIssues({ issue }: { issue: IssueDetail }) {
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const navigate = useNavigate();
  const { data: workspace } = useWorkspace(ws);
  const team = workspace?.teams.find((t) => t.id === issue.teamId);
  const createIssue = useCreateIssue();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const openIssue = (sub: Issue) => {
    if (!ws || !team) return;
    navigate({
      to: '/$ws/issue/$identifier',
      params: { ws, identifier: formatIdentifier(team.key, sub.number) },
    });
  };

  const addSub = async () => {
    if (!title.trim() || !team || !ws) return;
    await createIssue.mutateAsync({
      teamId: issue.teamId,
      teamKey: team.key,
      ws,
      input: { title: title.trim(), parentId: issue.id },
    });
    setTitle('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          Sub-issues {issue.subIssues.length > 0 ? `(${issue.subIssues.length})` : ''}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="flex flex-col rounded-[var(--radius)] border border-[var(--border)]">
        {issue.subIssues.map((sub) => (
          <button
            key={sub.id}
            onClick={() => openIssue(sub)}
            className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--hover)]"
          >
            <PriorityIcon priority={sub.priority as PriorityValue} size={14} />
            <span className="font-mono text-2xs text-[var(--text-tertiary)]">
              {team ? formatIdentifier(team.key, sub.number) : `#${sub.number}`}
            </span>
            <span className="truncate">{sub.title}</span>
          </button>
        ))}
        {issue.subIssues.length === 0 && !adding ? (
          <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
            No sub-issues.
          </p>
        ) : null}
        {adding ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSub();
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Sub-issue title…"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!title.trim()}
              onClick={addSub}
            >
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
