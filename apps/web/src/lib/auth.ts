import { createAuthClient } from 'better-auth/react';

/**
 * better-auth client. Same-origin: the better-auth handler is mounted at
 * `/api/auth/*` on the server, which the dev proxy forwards to :8787.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export const { signIn, signUp, signOut, useSession } = authClient;
