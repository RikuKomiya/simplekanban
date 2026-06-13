import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)] text-lg font-bold text-white">
            K
          </div>
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
