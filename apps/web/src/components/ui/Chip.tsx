import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ChipProps {
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
  color?: string;
}

/** Small inline chip — used for labels and active filters. */
export function Chip({ children, onRemove, className, color }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-2xs text-[var(--text-secondary)] max-w-[160px]',
        className,
      )}
    >
      {color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 ml-0.5 rounded-full p-0.5 hover:bg-[var(--hover)] hover:text-[var(--text)]"
        >
          <X size={10} />
        </button>
      ) : null}
    </span>
  );
}

/** Colored dot — used inline for labels. */
export function ColorDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  );
}
