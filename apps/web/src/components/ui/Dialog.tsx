import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  showClose?: boolean;
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onPointerDownOutside?: (e: Event) => void;
  ariaLabel?: string;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    { children, className, showClose = false, onEscapeKeyDown, onPointerDownOutside, ariaLabel },
    ref,
  ) => (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50 animate-overlay" />
      <RadixDialog.Content
        ref={ref}
        aria-label={ariaLabel}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
        className={cn(
          'fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2',
          'rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-pop',
          'focus:outline-none',
          className,
        )}
      >
        {children}
        {showClose ? (
          <RadixDialog.Close className="absolute right-3 top-3 rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={15} />
          </RadixDialog.Close>
        ) : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  ),
);
DialogContent.displayName = 'DialogContent';

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixDialog.Title className={cn('text-md font-semibold', className)}>
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <RadixDialog.Description className="text-xs text-[var(--text-secondary)]">
      {children}
    </RadixDialog.Description>
  );
}
