/** Default gap used when appending/prepending at an open end. */
export const SORT_ORDER_STEP = 1024;

/**
 * Compute a fractional sort order that sits strictly between `a` and `b`.
 *
 * - Both omitted → `0` (first item in an empty list).
 * - Only `a` (item placed after the last) → `a + STEP`.
 * - Only `b` (item placed before the first) → `b - STEP`.
 * - Both present → their midpoint.
 *
 * The midpoint strategy keeps reorders O(1) and collision-resistant: a fresh
 * jitter is mixed in when the gap collapses below floating-point resolution so
 * two concurrent inserts at the same slot don't produce identical keys.
 */
export function sortOrderBetween(a?: number, b?: number): number {
  // Empty list.
  if (a === undefined && b === undefined) {
    return 0;
  }

  // Append after the last item.
  if (a !== undefined && b === undefined) {
    return a + SORT_ORDER_STEP;
  }

  // Prepend before the first item.
  if (a === undefined && b !== undefined) {
    return b - SORT_ORDER_STEP;
  }

  // Both defined — `a` and `b` are guaranteed numbers here.
  const lo = a as number;
  const hi = b as number;

  // Normalize so we always work low → high regardless of argument order.
  const low = Math.min(lo, hi);
  const high = Math.max(lo, hi);

  const mid = low + (high - low) / 2;

  // If the gap is too small to represent a distinct midpoint, nudge with a
  // tiny jitter inside (low, high) to avoid exact collisions.
  if (mid <= low || mid >= high) {
    const jitter = (high - low) * (0.25 + Math.random() * 0.5);
    const nudged = low + jitter;
    if (nudged > low && nudged < high) {
      return nudged;
    }
    // Degenerate: low and high are effectively adjacent floats.
    return low;
  }

  return mid;
}
