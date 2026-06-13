import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Kbd } from '@/components/ui/Input';
import { useUiStore } from '@/stores/ui';

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: 'General',
    items: [
      [['⌘', 'K'], 'Open command palette'],
      [['C'], 'Create new issue'],
      [['?'], 'Show this help'],
    ],
  },
  {
    title: 'Navigation',
    items: [
      [['G', 'B'], 'Go to board'],
      [['G', 'L'], 'Go to list'],
      [['G', 'I'], 'Go to inbox'],
      [['G', 'M'], 'Go to my issues'],
    ],
  },
  {
    title: 'Issues (when focused)',
    items: [
      [['↑', '↓'], 'Move focus'],
      [['J', 'K'], 'Move focus'],
      [['↵'], 'Open issue'],
      [['S'], 'Change status'],
      [['A'], 'Assign'],
      [['P'], 'Set priority'],
      [['L'], 'Edit labels'],
      [['X'], 'Select issue'],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-5" showClose ariaLabel="Keyboard shortcuts">
        <DialogTitle className="mb-4">Keyboard shortcuts</DialogTitle>
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-2xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                {group.title}
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map(([keys, label]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--text-secondary)]">{label}</span>
                    <span className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
