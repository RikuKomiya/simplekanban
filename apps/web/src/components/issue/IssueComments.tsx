import { useState } from 'react';
import type { CommentWithAuthor } from '@simplekanban/shared';
import { MoreHorizontal } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '@/components/ui/Menu';
import {
  useAddComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useComments';
import { useSession } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { Markdown } from '@/components/issue/Markdown';

export function IssueComments({
  issueId,
  comments,
}: {
  issueId: string;
  comments: CommentWithAuthor[];
}) {
  const { data: session } = useSession();
  const me = session?.user;
  const add = useAddComment(issueId);
  const update = useUpdateComment(issueId);
  const del = useDeleteComment(issueId);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    add.mutate(draft.trim());
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        Comments
      </h3>

      <div className="flex flex-col gap-4">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar
                id={c.author.id}
                name={c.author.name || c.author.email}
                email={c.author.email}
                image={c.author.image}
                size={24}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {c.author.name || c.author.email}
                  </span>
                  <span className="text-2xs text-[var(--text-tertiary)]">
                    {formatRelative(c.createdAt)}
                    {c.updatedAt !== c.createdAt ? ' (edited)' : ''}
                  </span>
                  {me?.id === c.authorId ? (
                    <Menu>
                      <MenuTrigger asChild>
                        <button className="ml-auto rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
                          <MoreHorizontal size={14} />
                        </button>
                      </MenuTrigger>
                      <MenuContent align="end">
                        <MenuItem
                          onSelect={() => {
                            setEditingId(c.id);
                            setEditBody(c.body);
                          }}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          destructive
                          onSelect={() => del.mutate(c.id)}
                        >
                          Delete
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  ) : null}
                </div>
                {editingId === c.id ? (
                  <div className="mt-1.5 flex flex-col gap-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          update.mutate({ id: c.id, body: editBody.trim() });
                          setEditingId(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-0.5 text-sm">
                    <Markdown source={c.body} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Leave a comment…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            disabled={!draft.trim() || add.isPending}
            onClick={submit}
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
