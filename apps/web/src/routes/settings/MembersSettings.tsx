import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useInviteMember } from '@/hooks/useWorkspaceMutations';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function MembersSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const invite = useInviteMember(ws);
  const [email, setEmail] = useState('');

  const submit = async () => {
    if (!email.trim()) return;
    await invite.mutateAsync({ email: email.trim() });
    setEmail('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">Members</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Invite existing users to this workspace.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="member@example.com"
        />
        <Button
          variant="primary"
          disabled={!email.trim() || invite.isPending}
          onClick={submit}
        >
          Invite
        </Button>
      </div>

      <div className="flex flex-col rounded-md border border-[var(--border)]">
        {(workspace?.members ?? []).map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0"
          >
            <Avatar
              id={m.user.id}
              name={m.user.name || m.user.email}
              email={m.user.email}
              image={m.user.image}
              size={26}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.user.name || m.user.email}
              </p>
              <p className="truncate text-2xs text-[var(--text-tertiary)]">
                {m.user.email}
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-2xs capitalize text-[var(--text-secondary)]">
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
