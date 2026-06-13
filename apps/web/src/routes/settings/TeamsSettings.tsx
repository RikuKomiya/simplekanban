import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ApiError } from '@simplekanban/shared';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCreateTeam } from '@/hooks/useWorkspaceMutations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function TeamsSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const createTeam = useCreateTeam(ws);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);

  const submit = async () => {
    if (!name.trim() || !key) return;
    try {
      await createTeam.mutateAsync({ name: name.trim(), key });
      toast.success(`Team ${key} created`);
      setName('');
      setKey('');
      setKeyTouched(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to create team',
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">Teams</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Each team has its own board, workflow states, cycles, and issue
          numbering (e.g. ENG-42).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!keyTouched)
              setKey(
                e.target.value
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .slice(0, 4)
                  .toUpperCase(),
              );
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Team name"
        />
        <Input
          value={key}
          maxLength={6}
          onChange={(e) => {
            setKeyTouched(true);
            setKey(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="KEY"
          className="w-24"
        />
        <Button
          variant="primary"
          disabled={!name.trim() || !key || createTeam.isPending}
          onClick={submit}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-col rounded-md border border-[var(--border)]">
        {(workspace?.teams ?? []).length === 0 ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            No teams yet. Create one above to start tracking issues.
          </p>
        ) : (
          workspace!.teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
            >
              <span className="w-16 shrink-0 font-mono text-xs text-[var(--text-secondary)]">
                {t.key}
              </span>
              <span className="flex-1 text-sm">{t.name}</span>
              <Link
                to="/$ws/team/$teamKey/board"
                params={{ ws, teamKey: t.key }}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Open board
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
