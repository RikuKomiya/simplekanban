import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export const MenuContent = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'right' | 'bottom' | 'left';
  }
>(({ children, className, align = 'start', side = 'bottom' }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={6}
      className={cn(
        'z-50 min-w-[180px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-1 shadow-lg animate-pop',
        className,
      )}
    >
      {children}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
));
MenuContent.displayName = 'MenuContent';

export function MenuItem({
  children,
  onSelect,
  className,
  destructive,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm cursor-pointer outline-none',
        'data-[highlighted]:bg-[var(--hover)] data-[disabled]:opacity-40 data-[disabled]:pointer-events-none',
        destructive
          ? 'text-[var(--destructive)] data-[highlighted]:text-[var(--destructive)]'
          : 'text-[var(--text)]',
        className,
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2 py-1 text-2xs uppercase tracking-wide text-[var(--text-tertiary)]">
      {children}
    </DropdownMenu.Label>
  );
}
