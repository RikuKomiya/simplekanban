import type { ReactNode } from 'react';

export function PageHeader({
  title,
  icon,
  actions,
  tabs,
}: {
  title: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border)] px-4">
      {icon ? <span className="text-[var(--text-secondary)]">{icon}</span> : null}
      <h1 className="text-sm font-semibold">{title}</h1>
      {tabs ? <div className="ml-2 flex items-center gap-1">{tabs}</div> : null}
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  );
}
