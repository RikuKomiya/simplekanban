export interface ParsedIdentifier {
  teamKey: string;
  number: number;
}

/**
 * Parse an issue identifier like `"ENG-42"` into its team key and number.
 *
 * - Team key is upper-cased (case-insensitive input accepted).
 * - Surrounding whitespace is ignored.
 * - Throws on malformed input (no dash, non-numeric suffix, empty key).
 */
export function parseIdentifier(identifier: string): ParsedIdentifier {
  const trimmed = identifier.trim();
  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid issue identifier: "${identifier}"`);
  }
  const teamKey = match[1]!.toUpperCase();
  const number = Number.parseInt(match[2]!, 10);
  return { teamKey, number };
}

/** Safe variant: returns `null` instead of throwing on malformed input. */
export function tryParseIdentifier(
  identifier: string,
): ParsedIdentifier | null {
  try {
    return parseIdentifier(identifier);
  } catch {
    return null;
  }
}

/** Format a team key + number back into an identifier string. */
export function formatIdentifier(teamKey: string, number: number): string {
  return `${teamKey.toUpperCase()}-${number}`;
}
