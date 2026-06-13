import { createApiClient } from '@simplekanban/shared';
import { CLIENT_ID } from './clientId';

/**
 * Singleton typed API client. Same-origin (`baseUrl: ''`) so the better-auth
 * session cookie rides along automatically. The clientId lets the server
 * suppress realtime echoes of our own mutations.
 */
export const api = createApiClient({
  baseUrl: '',
  clientId: CLIENT_ID,
});

export { ApiError } from '@simplekanban/shared';
