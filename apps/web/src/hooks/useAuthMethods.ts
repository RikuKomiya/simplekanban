import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';

export interface AuthMethods {
  emailPassword: boolean;
  google: boolean;
}

export function useAuthMethods() {
  return useQuery({
    queryKey: qk.authMethods(),
    queryFn: async (): Promise<AuthMethods> => {
      const res = await fetch('/api/v1/auth-methods', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to load auth methods');
      }
      return res.json() as Promise<AuthMethods>;
    },
    staleTime: 5 * 60 * 1000,
  });
}
