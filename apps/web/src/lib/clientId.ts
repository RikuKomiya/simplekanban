const STORAGE_KEY = 'sk.clientId';

/**
 * Per-browser-tab-stable client id, minted once and persisted in localStorage.
 * Sent as `x-client-id` so the server can echo-suppress our own realtime events.
 */
export function getClientId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled — fall back to an ephemeral id.
    return crypto.randomUUID();
  }
}

export const CLIENT_ID = getClientId();
