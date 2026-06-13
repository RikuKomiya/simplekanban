import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-sm',
        'placeholder:text-[var(--text-tertiary)]',
        'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
        'transition-colors duration-100',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm leading-relaxed resize-none',
      'placeholder:text-[var(--text-tertiary)]',
      'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
      'transition-colors duration-100',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
      {children}
    </kbd>
  );
}
