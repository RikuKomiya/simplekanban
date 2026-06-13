import { describe, expect, test } from 'bun:test';
import { SORT_ORDER_STEP, sortOrderBetween } from './ordering.js';

describe('sortOrderBetween', () => {
  test('empty list returns 0', () => {
    expect(sortOrderBetween()).toBe(0);
    expect(sortOrderBetween(undefined, undefined)).toBe(0);
  });

  test('append after last item steps up', () => {
    expect(sortOrderBetween(0)).toBe(SORT_ORDER_STEP);
    expect(sortOrderBetween(1024)).toBe(2048);
    expect(sortOrderBetween(5000, undefined)).toBe(5000 + SORT_ORDER_STEP);
  });

  test('prepend before first item steps down', () => {
    expect(sortOrderBetween(undefined, 0)).toBe(-SORT_ORDER_STEP);
    expect(sortOrderBetween(undefined, 1024)).toBe(0);
    expect(sortOrderBetween(undefined, 2048)).toBe(1024);
  });

  test('between two values returns the midpoint', () => {
    expect(sortOrderBetween(0, 1024)).toBe(512);
    expect(sortOrderBetween(100, 200)).toBe(150);
    expect(sortOrderBetween(0, 2)).toBe(1);
  });

  test('argument order does not matter', () => {
    expect(sortOrderBetween(200, 100)).toBe(150);
    expect(sortOrderBetween(1024, 0)).toBe(512);
  });

  test('result is strictly between the bounds', () => {
    const a = 1.0;
    const b = 1.0000000001;
    const mid = sortOrderBetween(a, b);
    expect(mid).toBeGreaterThan(Math.min(a, b));
    expect(mid).toBeLessThan(Math.max(a, b));
  });

  test('repeated inserts keep ordering monotonic', () => {
    let lo = 0;
    let hi = 1024;
    let prev = -Infinity;
    for (let i = 0; i < 30; i++) {
      const mid = sortOrderBetween(lo, hi);
      expect(mid).toBeGreaterThan(lo);
      expect(mid).toBeLessThan(hi);
      expect(mid).toBeGreaterThan(prev);
      prev = lo;
      // Keep subdividing the left half — the tightest case.
      hi = mid;
    }
  });

  test('inserts at the front of a growing list stay ordered', () => {
    const items: number[] = [sortOrderBetween()];
    for (let i = 0; i < 20; i++) {
      const next = sortOrderBetween(undefined, items[0]);
      expect(next).toBeLessThan(items[0]!);
      items.unshift(next);
    }
    const sorted = [...items].sort((x, y) => x - y);
    expect(items).toEqual(sorted);
  });

  test('inserts at the back of a growing list stay ordered', () => {
    const items: number[] = [sortOrderBetween()];
    for (let i = 0; i < 20; i++) {
      const next = sortOrderBetween(items[items.length - 1]);
      expect(next).toBeGreaterThan(items[items.length - 1]!);
      items.push(next);
    }
    const sorted = [...items].sort((x, y) => x - y);
    expect(items).toEqual(sorted);
  });
});
