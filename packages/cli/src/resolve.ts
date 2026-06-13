import {
  PRIORITY_KEYS,
  PRIORITY_LABELS,
  type PriorityValue,
  type Team,
  type UserSummary,
  type WorkflowState,
  type Label,
} from '@simplekanban/shared';

/**
 * Raised when a name cannot be resolved to exactly one entity. Carries the
 * candidate list so the CLI can print helpful suggestions.
 */
export class ResolveError extends Error {
  readonly candidates: string[];
  constructor(message: string, candidates: string[] = []) {
    super(message);
    this.name = 'ResolveError';
    this.candidates = candidates;
  }
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolve a free-text needle against a set of candidates by name.
 *
 * Matching is case-insensitive. Resolution prefers, in order:
 *   1. an exact (normalized) match
 *   2. a unique prefix match
 *
 * Throws {@link ResolveError} when nothing matches or when a prefix is
 * ambiguous (multiple candidates and no exact hit).
 *
 * @param items     candidate entities
 * @param needle    user-supplied name
 * @param nameOf    extracts the comparable name from an item
 * @param kind      label used in error messages (e.g. "state")
 */
export function resolveByName<T>(
  items: readonly T[],
  needle: string,
  nameOf: (item: T) => string,
  kind: string,
): T {
  const n = norm(needle);
  if (n.length === 0) {
    throw new ResolveError(`Empty ${kind} name.`);
  }

  const exact = items.filter((it) => norm(nameOf(it)) === n);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) {
    throw new ResolveError(
      `Ambiguous ${kind} "${needle}": multiple exact matches.`,
      exact.map(nameOf),
    );
  }

  const prefix = items.filter((it) => norm(nameOf(it)).startsWith(n));
  if (prefix.length === 1) return prefix[0]!;
  if (prefix.length > 1) {
    throw new ResolveError(
      `Ambiguous ${kind} "${needle}". Did you mean one of:`,
      prefix.map(nameOf),
    );
  }

  throw new ResolveError(
    `No ${kind} matches "${needle}".`,
    items.map(nameOf),
  );
}

/** Resolve a team by key (preferred) or name. */
export function resolveTeam(teams: readonly Team[], needle: string): Team {
  const n = norm(needle);
  // Exact key match first (keys are the canonical identifier, e.g. "ENG").
  const keyExact = teams.filter((t) => norm(t.key) === n);
  if (keyExact.length === 1) return keyExact[0]!;
  // Then exact name, then prefix on key, then prefix on name.
  const candidates = teams.map((t) => `${t.key} (${t.name})`);
  const nameExact = teams.filter((t) => norm(t.name) === n);
  if (nameExact.length === 1) return nameExact[0]!;

  const keyPrefix = teams.filter((t) => norm(t.key).startsWith(n));
  if (keyPrefix.length === 1) return keyPrefix[0]!;
  const namePrefix = teams.filter((t) => norm(t.name).startsWith(n));
  if (namePrefix.length === 1) return namePrefix[0]!;

  const all = [...keyPrefix, ...namePrefix];
  if (all.length > 1) {
    throw new ResolveError(
      `Ambiguous team "${needle}". Candidates:`,
      candidates,
    );
  }
  throw new ResolveError(`No team matches "${needle}".`, candidates);
}

/** Resolve a workflow state by name. */
export function resolveState(
  states: readonly WorkflowState[],
  needle: string,
): WorkflowState {
  return resolveByName(states, needle, (s) => s.name, 'state');
}

/** Resolve a label by name. */
export function resolveLabel(labels: readonly Label[], needle: string): Label {
  return resolveByName(labels, needle, (l) => l.name, 'label');
}

/**
 * Resolve an assignee. The literal `me` resolves to the current user;
 * `none`/`unassigned`/empty resolve to `null` (clear assignee). Otherwise
 * matches by name or email.
 */
export function resolveAssignee(
  members: readonly UserSummary[],
  needle: string,
  currentUserId: string,
): string | null {
  const n = norm(needle);
  if (n === 'me') return currentUserId;
  if (n === 'none' || n === 'unassigned' || n === 'nobody' || n === '') {
    return null;
  }

  const candidates = members.map((m) => `${m.name} <${m.email}>`);
  // Exact email, then exact name, then prefix on name/email.
  const emailExact = members.filter((m) => norm(m.email) === n);
  if (emailExact.length === 1) return emailExact[0]!.id;
  const nameExact = members.filter((m) => norm(m.name) === n);
  if (nameExact.length === 1) return nameExact[0]!.id;

  const prefix = members.filter(
    (m) => norm(m.name).startsWith(n) || norm(m.email).startsWith(n),
  );
  if (prefix.length === 1) return prefix[0]!.id;
  if (prefix.length > 1) {
    throw new ResolveError(
      `Ambiguous assignee "${needle}". Candidates:`,
      candidates,
    );
  }
  throw new ResolveError(`No member matches "${needle}".`, candidates);
}

const PRIORITY_NAME_TO_VALUE: ReadonlyMap<string, PriorityValue> = new Map(
  (Object.entries(PRIORITY_KEYS) as [string, string][]).map(
    ([value, key]) => [key, Number(value) as PriorityValue],
  ),
);

/**
 * Resolve a priority from a name (`urgent`/`high`/`medium`/`low`/`none`),
 * a numeric string (`0`-`4`), or a prefix of a name. Returns the integer
 * priority value (0=none, 1=urgent, 2=high, 3=medium, 4=low).
 */
export function resolvePriority(needle: string): PriorityValue {
  const n = norm(needle);
  if (n.length === 0) throw new ResolveError('Empty priority.');

  // Numeric form.
  if (/^[0-4]$/.test(n)) {
    return Number(n) as PriorityValue;
  }

  // Exact name.
  const exact = PRIORITY_NAME_TO_VALUE.get(n);
  if (exact !== undefined) return exact;

  // Prefix on name.
  const keys = [...PRIORITY_NAME_TO_VALUE.keys()];
  const prefixMatches = keys.filter((k) => k.startsWith(n));
  if (prefixMatches.length === 1) {
    return PRIORITY_NAME_TO_VALUE.get(prefixMatches[0]!)!;
  }
  if (prefixMatches.length > 1) {
    throw new ResolveError(
      `Ambiguous priority "${needle}".`,
      prefixMatches,
    );
  }
  throw new ResolveError(
    `No priority matches "${needle}". Use one of: urgent, high, medium, low, none (or 0-4).`,
    Object.values(PRIORITY_KEYS),
  );
}

/** Human-readable priority label for a value. */
export function priorityLabel(value: number): string {
  if (value in PRIORITY_LABELS) {
    return PRIORITY_LABELS[value as PriorityValue];
  }
  return String(value);
}
