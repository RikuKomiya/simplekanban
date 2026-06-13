import { describe, expect, test } from 'bun:test';
import {
  formatIdentifier,
  parseIdentifier,
  tryParseIdentifier,
} from './identifier.js';

describe('parseIdentifier', () => {
  test('parses a standard identifier', () => {
    expect(parseIdentifier('ENG-42')).toEqual({ teamKey: 'ENG', number: 42 });
  });

  test('upper-cases the team key', () => {
    expect(parseIdentifier('eng-7')).toEqual({ teamKey: 'ENG', number: 7 });
    expect(parseIdentifier('Web-1')).toEqual({ teamKey: 'WEB', number: 1 });
  });

  test('trims surrounding whitespace', () => {
    expect(parseIdentifier('  ENG-42  ')).toEqual({
      teamKey: 'ENG',
      number: 42,
    });
  });

  test('supports alphanumeric team keys', () => {
    expect(parseIdentifier('A1B-100')).toEqual({
      teamKey: 'A1B',
      number: 100,
    });
  });

  test('handles large numbers', () => {
    expect(parseIdentifier('ENG-123456')).toEqual({
      teamKey: 'ENG',
      number: 123456,
    });
  });

  test('throws on missing dash', () => {
    expect(() => parseIdentifier('ENG42')).toThrow();
  });

  test('throws on non-numeric suffix', () => {
    expect(() => parseIdentifier('ENG-foo')).toThrow();
  });

  test('throws on empty key', () => {
    expect(() => parseIdentifier('-42')).toThrow();
  });

  test('throws on a key that starts with a digit', () => {
    expect(() => parseIdentifier('1NG-42')).toThrow();
  });

  test('throws on empty string', () => {
    expect(() => parseIdentifier('')).toThrow();
  });
});

describe('tryParseIdentifier', () => {
  test('returns parsed value for valid input', () => {
    expect(tryParseIdentifier('ENG-42')).toEqual({
      teamKey: 'ENG',
      number: 42,
    });
  });

  test('returns null for invalid input', () => {
    expect(tryParseIdentifier('nope')).toBeNull();
  });
});

describe('formatIdentifier', () => {
  test('formats key + number', () => {
    expect(formatIdentifier('ENG', 42)).toBe('ENG-42');
  });

  test('upper-cases the key', () => {
    expect(formatIdentifier('eng', 42)).toBe('ENG-42');
  });

  test('round-trips with parseIdentifier', () => {
    const parsed = parseIdentifier('WEB-9');
    expect(formatIdentifier(parsed.teamKey, parsed.number)).toBe('WEB-9');
  });
});
