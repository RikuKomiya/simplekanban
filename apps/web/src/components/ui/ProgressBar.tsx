import { cn } from '@/lib/cn';

export function ProgressBar({
  value,
  className,
  color = 'var(--accent)',
}: {
  /** 0–1 fraction. */
  value: number;
  className?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]',
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
