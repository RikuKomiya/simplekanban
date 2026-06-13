import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody } from '@simplekanban/shared';

/**
 * Domain error carrying an API error `code` + HTTP `status`. Thrown anywhere in
 * a handler and converted to the `{ error: { code, message } }` envelope by the
 * app's `onError` hook.
 */
export class HttpError extends Error {
  readonly code: string;
  readonly status: ContentfulStatusCode;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = status;
  }
}

export const badRequest = (message: string, code = 'bad_request') =>
  new HttpError(400, code, message);
export const unauthorized = (message = 'Authentication required') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Resource not found') =>
  new HttpError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict') =>
  new HttpError(409, code, message);

/** Build the error envelope body. */
export function errorBody(code: string, message: string): ApiErrorBody {
  return { error: { code, message } };
}

/** Write an error envelope to a Hono context. */
export function sendError(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
): Response {
  return c.json(errorBody(code, message), status);
}
