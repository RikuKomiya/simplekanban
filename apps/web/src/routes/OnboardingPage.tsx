import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@simplekanban/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { useMe } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Spinner } from '@/components/ui/Spinner';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me, isLoading } = useMe();

  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamKey, setTeamKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If the user already has a workspace, jump straight in.
  useEffect(() => {
    if (me && me.workspaces.length > 0) {
      navigate({
        to: '/$ws',
        params: { ws: me.workspaces[0]!.id },
        replace: true,
      });
    }
  }, [me, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--bg)]">
        <Spinner />
      </div>
    );
  }

  if (me && me.workspaces.length > 0) {
    return <div className="h-dvh bg-[var(--bg)]" />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Use the values as displayed in the inputs — they are kept normalized by
    // the onChange handlers, so what the user sees is what gets submitted.
    const slug = wsSlug || slugify(wsName);
    const key = teamKey;
    if (!wsName || !teamName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!slug) {
      toast.error('Workspace URL slug is required (a-z, 0-9, hyphen)');
      return;
    }
    if (!key) {
      toast.error('Team key is required (e.g. ENG)');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.workspaces.create({ name: wsName, slug });
      try {
        await api.workspaces.createTeam(created.id, { name: teamName, key });
      } catch (err) {
        // The workspace exists at this point — surface the team error but
        // still enter the workspace so a retried submit can't hit slug_taken.
        toast.error(
          err instanceof ApiError
            ? `Workspace created, but team failed: ${err.message}`
            : 'Workspace created, but creating the team failed',
        );
      }
      await qc.invalidateQueries({ queryKey: qk.me() });
      navigate({ to: '/$ws', params: { ws: created.id }, replace: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to create workspace',
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Set up your first workspace and team."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              Workspace name
            </span>
            <Input
              required
              value={wsName}
              onChange={(e) => {
                setWsName(e.target.value);
                if (!slugTouched) setWsSlug(slugify(e.target.value));
              }}
              placeholder="Acme Inc"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              Workspace URL slug
            </span>
            <Input
              required
              value={wsSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setWsSlug(slugify(e.target.value));
              }}
              placeholder="acme"
            />
          </label>
        </div>

        <div className="h-px bg-[var(--border)]" />

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              First team name
            </span>
            <Input
              required
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (!keyTouched)
                  setTeamKey(
                    e.target.value
                      .replace(/[^a-zA-Z0-9]/g, '')
                      .slice(0, 4)
                      .toUpperCase(),
                  );
              }}
              placeholder="Engineering"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              Team key (used in IDs, e.g. ENG-42)
            </span>
            <Input
              required
              maxLength={6}
              value={teamKey}
              onChange={(e) => {
                setKeyTouched(true);
                setTeamKey(
                  e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
                );
              }}
              placeholder="ENG"
            />
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="mt-1 w-full"
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </AuthLayout>
  );
}
