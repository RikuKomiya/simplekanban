import { cn } from '@/lib/cn';

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn('skeleton', className)} style={style} />;
}

/** A list of skeleton rows for loading states. */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1 max-w-[40%]" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBoard() {
  return (
    <div className="flex gap-3 p-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="w-72 shrink-0">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, c) => (
              <Skeleton key={c} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
