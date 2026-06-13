import { useEffect, type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useSession } from '@/lib/auth';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Wraps all authenticated routes. While the session is loading we show a
 * centered spinner; if there's no session we redirect to /login.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isPending && !session) {
      navigate({
        to: '/login',
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [isPending, session, navigate, pathname]);

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--bg)]">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--bg)]" />
    );
  }

  return <>{children}</>;
}
