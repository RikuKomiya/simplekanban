import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? (
        <div className="text-[var(--text-tertiary)]">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <p className="text-md font-medium text-[var(--text)]">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
