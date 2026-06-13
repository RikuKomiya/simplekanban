import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import type { ApiKeyWithSecret } from '@simplekanban/shared';
import { Check, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '@/hooks/useApiKeys';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatRelative } from '@/lib/format';

export function ApiKeysSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: keys } = useApiKeys(ws);
  const createKey = useCreateApiKey(ws);
  const deleteKey = useDeleteApiKey(ws);

  const [name, setName] = useState('');
  const [justCreated, setJustCreated] = useState<ApiKeyWithSecret | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    const created = await createKey.mutateAsync(name.trim());
    setJustCreated(created);
    setName('');
  };

  const copy = () => {
    if (!justCreated) return;
    navigator.clipboard.writeText(justCreated.key);
    setCopied(true);
    toast.success('API key copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">API keys</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Use API keys with the <code className="font-mono">kan</code> CLI or
          coding agents. The plaintext key is shown only once at creation.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Key name (e.g. CLI on laptop)"
        />
        <Button
          variant="primary"
          disabled={!name.trim() || createKey.isPending}
          onClick={submit}
        >
          Create key
        </Button>
      </div>

      {justCreated ? (
        <div className="rounded-md border border-[var(--accent)] bg-[var(--accent)]/10 p-3">
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            Copy your new key now — you won't see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-[var(--bg)] px-2 py-1.5 font-mono text-xs">
              {justCreated.key}
            </code>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col rounded-md border border-[var(--border)]">
        {(keys ?? []).length === 0 ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            No API keys yet.
          </p>
        ) : (
          keys!.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{k.name}</p>
                <p className="truncate font-mono text-2xs text-[var(--text-tertiary)]">
                  {k.prefix}…
                  {k.lastUsedAt
                    ? ` · last used ${formatRelative(k.lastUsedAt)}`
                    : ' · never used'}
                </p>
              </div>
              <button
                onClick={() => deleteKey.mutate(k.id)}
                className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--hover)] hover:text-[var(--destructive)]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
