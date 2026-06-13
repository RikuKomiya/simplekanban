import clsx, { type ClassValue } from 'clsx';

/** Thin className concatenation helper. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
