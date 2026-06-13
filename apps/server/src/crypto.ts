import { nanoid } from 'nanoid';
import { API_KEY_PREFIX } from '@simplekanban/shared';

/** Compute the hex-encoded SHA-256 hash of a string (Web Crypto, isomorphic). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

export interface GeneratedApiKey {
  /** Full plaintext key (`sk_...`) — returned to the caller only at creation. */
  plaintext: string;
  /** SHA-256 hex of the plaintext, stored in the DB. */
  hashedKey: string;
  /** Display prefix: first 8 chars of the plaintext (`sk_xxxxx`). */
  prefix: string;
}

/** Mint a new API key: `sk_` + 40 url-safe chars. */
export async function generateApiKey(): Promise<GeneratedApiKey> {
  const plaintext = `${API_KEY_PREFIX}${nanoid(40)}`;
  const hashedKey = await sha256Hex(plaintext);
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hashedKey, prefix };
}
