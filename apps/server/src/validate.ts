import type { Context } from 'hono';
import type { z } from 'zod';
import { badRequest } from './errors.ts';

/** Parse + validate a JSON request body against a zod schema, or 400. */
export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw badRequest('Request body must be valid JSON', 'invalid_json');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw badRequest(formatZodError(result.error), 'validation_error');
  }
  return result.data;
}

/** Validate a plain object (e.g. query params) against a zod schema, or 400. */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest(formatZodError(result.error), 'validation_error');
  }
  return result.data;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}
