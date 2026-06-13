import { describe, expect, test } from 'bun:test';
import type {
  Label,
  Team,
  UserSummary,
  WorkflowState,
} from '@simplekanban/shared';
import {
  ResolveError,
  priorityLabel,
  resolveAssignee,
  resolveByName,
  resolveLabel,
  resolvePriority,
  resolveState,
  resolveTeam,
} from './resolve.js';

const team = (key: string, name: string, id = key.toLowerCase()): Team => ({
  id,
  workspaceId: 'ws1',
  name,
  key,
  color: null,
  icon: null,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const state = (name: string, id = name): WorkflowState => ({
  id,
  teamId: 't1',
  name,
  type: 'started',
  color: '#fff',
  position: 0,
});

const label = (name: string, id = name): Label => ({
  id,
  workspaceId: 'ws1',
  name,
  color: '#fff',
});

const user = (name: string, email: string, id = name): UserSummary => ({
  id,
  name,
  email,
  image: null,
});

describe('resolveByName', () => {
  const items = [state('Todo'), state('In Progress'), state('In Review')];

  test('exact case-insensitive match wins', () => {
    expect(resolveByName(items, 'todo', (s) => s.name, 'state').name).toBe(
      'Todo',
    );
  });

  test('unique prefix match', () => {
    expect(resolveByName(items, 'tod', (s) => s.name, 'state').name).toBe(
      'Todo',
    );
  });

  test('ambiguous prefix throws with candidates', () => {
    try {
      resolveByName(items, 'in', (s) => s.name, 'state');
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ResolveError);
      expect((e as ResolveError).candidates).toEqual([
        'In Progress',
        'In Review',
      ]);
    }
  });

  test('exact match beats ambiguous prefix', () => {
    const withExact = [state('In'), state('In Progress')];
    expect(resolveByName(withExact, 'in', (s) => s.name, 'state').name).toBe(
      'In',
    );
  });

  test('no match throws with all candidates', () => {
    expect(() => resolveByName(items, 'xyz', (s) => s.name, 'state')).toThrow(
      ResolveError,
    );
  });

  test('empty needle throws', () => {
    expect(() => resolveByName(items, '  ', (s) => s.name, 'state')).toThrow(
      ResolveError,
    );
  });
});

describe('resolveState / resolveLabel', () => {
  test('resolveState resolves by name', () => {
    const states = [state('Done'), state('Backlog')];
    expect(resolveState(states, 'don').name).toBe('Done');
  });

  test('resolveLabel resolves by name', () => {
    const labels = [label('bug'), label('feature')];
    expect(resolveLabel(labels, 'BUG').name).toBe('bug');
  });
});

describe('resolveTeam', () => {
  const teams = [team('ENG', 'Engineering'), team('DES', 'Design')];

  test('resolves by exact key (case-insensitive)', () => {
    expect(resolveTeam(teams, 'eng').key).toBe('ENG');
  });

  test('resolves by exact name', () => {
    expect(resolveTeam(teams, 'Design').key).toBe('DES');
  });

  test('resolves by key prefix', () => {
    expect(resolveTeam(teams, 'en').key).toBe('ENG');
  });

  test('throws on no match', () => {
    expect(() => resolveTeam(teams, 'zzz')).toThrow(ResolveError);
  });

  test('key match wins over name prefix collision', () => {
    const ts = [team('IN', 'Infra'), team('OPS', 'Internal Ops')];
    // "in" is an exact key match for IN even though it prefixes "Internal".
    expect(resolveTeam(ts, 'in').key).toBe('IN');
  });
});

describe('resolveAssignee', () => {
  const members = [
    user('Alice', 'alice@example.com', 'u1'),
    user('Bob', 'bob@example.com', 'u2'),
    user('Alicia', 'alicia@example.com', 'u3'),
  ];

  test('"me" resolves to current user id', () => {
    expect(resolveAssignee(members, 'me', 'u2')).toBe('u2');
  });

  test('"none"/"unassigned" resolves to null', () => {
    expect(resolveAssignee(members, 'none', 'u2')).toBeNull();
    expect(resolveAssignee(members, 'unassigned', 'u2')).toBeNull();
  });

  test('resolves by exact email', () => {
    expect(resolveAssignee(members, 'bob@example.com', 'u1')).toBe('u2');
  });

  test('resolves by exact name even when it prefixes another', () => {
    // "Alice" is exact for u1 although "Alicia" also starts with "Alic".
    expect(resolveAssignee(members, 'Alice', 'u1')).toBe('u1');
  });

  test('ambiguous prefix throws', () => {
    expect(() => resolveAssignee(members, 'Alic', 'u1')).toThrow(ResolveError);
  });

  test('no match throws', () => {
    expect(() => resolveAssignee(members, 'zoe', 'u1')).toThrow(ResolveError);
  });
});

describe('resolvePriority', () => {
  test('resolves by name', () => {
    expect(resolvePriority('urgent')).toBe(1);
    expect(resolvePriority('high')).toBe(2);
    expect(resolvePriority('medium')).toBe(3);
    expect(resolvePriority('low')).toBe(4);
    expect(resolvePriority('none')).toBe(0);
  });

  test('case-insensitive', () => {
    expect(resolvePriority('URGENT')).toBe(1);
  });

  test('numeric strings', () => {
    expect(resolvePriority('0')).toBe(0);
    expect(resolvePriority('1')).toBe(1);
    expect(resolvePriority('4')).toBe(4);
  });

  test('prefix match', () => {
    expect(resolvePriority('urg')).toBe(1);
    expect(resolvePriority('med')).toBe(3);
  });

  test('rejects out-of-range numbers', () => {
    expect(() => resolvePriority('5')).toThrow(ResolveError);
  });

  test('rejects unknown names', () => {
    expect(() => resolvePriority('critical')).toThrow(ResolveError);
  });
});

describe('priorityLabel', () => {
  test('maps values to labels', () => {
    expect(priorityLabel(0)).toBe('No priority');
    expect(priorityLabel(1)).toBe('Urgent');
    expect(priorityLabel(4)).toBe('Low');
  });
});
