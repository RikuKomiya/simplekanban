import * as RadixPopover from '@radix-ui/react-popover';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

interface PopoverContentProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  onOpenAutoFocus?: (e: Event) => void;
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { children, className, align = 'start', side = 'bottom', sideOffset = 6, onOpenAutoFocus },
    ref,
  ) => (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          'z-50 min-w-[200px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-1 shadow-lg animate-pop',
          'origin-[var(--radix-popover-content-transform-origin)]',
          className,
        )}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  ),
);
PopoverContent.displayName = 'PopoverContent';
