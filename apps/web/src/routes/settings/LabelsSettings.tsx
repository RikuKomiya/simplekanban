import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  useCreateLabel,
  useDeleteLabel,
  useUpdateLabel,
} from '@/hooks/useLabels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorDot } from '@/components/ui/Chip';

const PRESET_COLORS = [
  '#5e6ad2',
  '#26b5ce',
  '#4cb782',
  '#f2c94c',
  '#eb5757',
  '#bb87fc',
  '#e07a9b',
  '#f2994a',
];

export function LabelsSettings() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const { data: workspace } = useWorkspace(ws);
  const createLabel = useCreateLabel(ws);
  const updateLabel = useUpdateLabel(ws);
  const deleteLabel = useDeleteLabel(ws);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]!);

  const submit = async () => {
    if (!name.trim()) return;
    await createLabel.mutateAsync({ name: name.trim(), color });
    setName('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-md font-semibold">Labels</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Labels are shared across all teams in this workspace.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2">
          <ColorDot color={color} size={12} />
          <div className="flex gap-1 py-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-4 w-4 rounded-full ring-offset-1 ring-offset-[var(--bg)] data-[active=true]:ring-2"
                data-active={c === color}
                style={{ backgroundColor: c, boxShadow: c === color ? `0 0 0 2px var(--bg), 0 0 0 3px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Label name"
        />
        <Button
          variant="primary"
          disabled={!name.trim() || createLabel.isPending}
          onClick={submit}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-col rounded-md border border-[var(--border)]">
        {(workspace?.labels ?? []).length === 0 ? (
          <p className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
            No labels yet.
          </p>
        ) : (
          workspace!.labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
            >
              <ColorDot color={l.color} size={12} />
              <input
                defaultValue={l.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== l.name)
                    updateLabel.mutate({ id: l.id, input: { name: v } });
                }}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={() => deleteLabel.mutate(l.id)}
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
