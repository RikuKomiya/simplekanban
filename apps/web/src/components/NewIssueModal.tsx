import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { CreateIssueInput, PriorityValue } from '@simplekanban/shared';
import { PRIORITY_LABELS } from '@simplekanban/shared';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea, Kbd } from '@/components/ui/Input';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { StateIcon } from '@/components/icons/StateIcon';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorDot } from '@/components/ui/Chip';
import {
  assigneeOptions,
  labelOptions,
  priorityFromString,
  priorityOptions,
  stateOptions,
} from '@/components/pickers/options';
import { useUiStore } from '@/stores/ui';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useStates } from '@/hooks/useTeamData';
import { useCreateIssue } from '@/hooks/useCreateIssue';
import { cn } from '@/lib/cn';

const PILL =
  'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors';

export function NewIssueModal() {
  const { ws } = useParams({ strict: false }) as { ws?: string };
  const navigate = useNavigate();
  const open = useUiStore((s) => s.newIssueOpen);
  const prefill = useUiStore((s) => s.newIssuePrefill);
  const close = useUiStore((s) => s.closeNewIssue);

  const { data: workspace } = useWorkspace(ws);
  const teams = workspace?.teams ?? [];
  const members = workspace?.members ?? [];
  const labels = workspace?.labels ?? [];
  const createIssue = useCreateIssue();

  const [teamId, setTeamId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stateId, setStateId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<PriorityValue>(0);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<string>('');

  const titleRef = useRef<HTMLInputElement>(null);

  const { data: states } = useStates(teamId || undefined);

  // Initialize from prefill on open.
  useEffect(() => {
    if (!open) return;
    setTeamId(prefill.teamId ?? teams[0]?.id ?? '');
    setStateId(prefill.stateId);
    setPriority(prefill.priority ?? 0);
    setAssigneeId(prefill.assigneeId ?? null);
    setTitle('');
    setDescription('');
    setLabelIds([]);
    setEstimate('');
    // focus title shortly after the dialog mounts.
    const t = setTimeout(() => titleRef.current?.focus(), 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const team = teams.find((t) => t.id === teamId);
  const selectedState = states?.find((s) => s.id === stateId);
  const assignee = members.find((m) => m.userId === assigneeId)?.user;
  const selectedLabels = labels.filter((l) => labelIds.includes(l.id));

  const userSummaries = useMemo(
    () => members.map((m) => m.user),
    [members],
  );

  const reset = () => {
    setTitle('');
    setDescription('');
    setStateId(undefined);
    setPriority(0);
    setAssigneeId(null);
    setLabelIds([]);
    setEstimate('');
    setTimeout(() => titleRef.current?.focus(), 30);
  };

  const submit = async (createAnother: boolean) => {
    if (!title.trim() || !teamId || !ws || !team) return;
    const input: CreateIssueInput = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      ...(stateId ? { stateId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(labelIds.length ? { labelIds } : {}),
      ...(estimate ? { estimate: Number(estimate) } : {}),
    };
    await createIssue.mutateAsync({
      teamId,
      teamKey: team.key,
      ws,
      input,
      onOpen: (identifier) =>
        navigate({ to: '/$ws/issue/$identifier', params: { ws, identifier } }),
    });
    if (createAnother) {
      reset();
    } else {
      close();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit(e.shiftKey);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="top-[12%] max-w-2xl p-0"
        ariaLabel="New issue"
        onPointerDownOutside={(e) => {
          // Don't close when interacting with a picker popover.
          if ((e.target as HTMLElement)?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <div onKeyDown={onKeyDown} className="flex flex-col">
          {/* Team selector header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
            <SelectMenu
              options={teams.map((t) => ({
                value: t.id,
                label: t.name,
                hint: t.key,
              }))}
              value={teamId}
              onSelect={setTeamId}
              trigger={
                <button className={cn(PILL, 'font-medium text-[var(--text)]')}>
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ backgroundColor: team?.color ?? 'var(--accent)' }}
                  >
                    {team?.key.slice(0, 2)}
                  </span>
                  {team?.name ?? 'Select team'}
                </button>
              }
              searchPlaceholder="Switch team…"
            />
            <span className="text-2xs text-[var(--text-tertiary)]">
              New issue
            </span>
          </div>

          {/* Title + description */}
          <div className="flex flex-col gap-2 px-4 py-3">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description…"
              rows={4}
              className="border-none bg-transparent px-0 text-sm focus:ring-0"
            />
          </div>

          {/* Property pills */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
            <SelectMenu
              options={states ? stateOptions(states) : []}
              value={stateId}
              onSelect={setStateId}
              trigger={
                <button className={PILL}>
                  {selectedState ? (
                    <>
                      <StateIcon
                        type={selectedState.type}
                        color={selectedState.color}
                        size={14}
                      />
                      {selectedState.name}
                    </>
                  ) : (
                    <>
                      <StateIcon type="backlog" color="var(--text-tertiary)" size={14} />
                      Status
                    </>
                  )}
                </button>
              }
              searchPlaceholder="Set status…"
            />

            <SelectMenu
              options={priorityOptions()}
              value={String(priority)}
              onSelect={(v) => setPriority(priorityFromString(v))}
              trigger={
                <button className={PILL}>
                  <PriorityIcon priority={priority} size={14} />
                  {PRIORITY_LABELS[priority]}
                </button>
              }
              searchPlaceholder="Set priority…"
            />

            <SelectMenu
              options={assigneeOptions(userSummaries)}
              value={assigneeId ?? '__none__'}
              onSelect={(v) => setAssigneeId(v === '__none__' ? null : v)}
              trigger={
                <button className={PILL}>
                  {assignee ? (
                    <>
                      <Avatar
                        id={assignee.id}
                        name={assignee.name || assignee.email}
                        email={assignee.email}
                        image={assignee.image}
                        size={15}
                      />
                      {assignee.name || assignee.email}
                    </>
                  ) : (
                    <>
                      <span className="block h-3.5 w-3.5 rounded-full border border-dashed border-[var(--text-tertiary)]" />
                      Assignee
                    </>
                  )}
                </button>
              }
              searchPlaceholder="Assign to…"
            />

            <SelectMenu
              options={labelOptions(labels)}
              value={labelIds}
              multiple
              onSelect={(v) =>
                setLabelIds((prev) =>
                  prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
                )
              }
              trigger={
                <button className={PILL}>
                  {selectedLabels.length ? (
                    <span className="flex items-center gap-1">
                      {selectedLabels.slice(0, 3).map((l) => (
                        <ColorDot key={l.id} color={l.color} size={8} />
                      ))}
                      {selectedLabels.length} label
                      {selectedLabels.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <>
                      <ColorDot color="var(--text-tertiary)" size={8} />
                      Labels
                    </>
                  )}
                </button>
              }
              searchPlaceholder="Add labels…"
            />

            <input
              value={estimate}
              onChange={(e) =>
                setEstimate(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))
              }
              placeholder="Est"
              className={cn(PILL, 'w-14 outline-none placeholder:text-[var(--text-tertiary)]')}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-2xs text-[var(--text-tertiary)]">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
              <span>create</span>
              <span className="mx-1">·</span>
              <Kbd>⌘</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>↵</Kbd>
              <span>create more</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!title.trim() || createIssue.isPending}
                onClick={() => submit(false)}
              >
                Create issue
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
