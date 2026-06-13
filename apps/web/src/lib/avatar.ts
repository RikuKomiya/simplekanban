/** Deterministic avatar color + initials derived from a user id/name. */

const AVATAR_COLORS = [
  '#5e6ad2',
  '#26b5ce',
  '#4cb782',
  '#f2c94c',
  '#eb5757',
  '#bb87fc',
  '#d4a373',
  '#e07a9b',
  '#6fcf97',
  '#56a3f5',
  '#f2994a',
  '#9b8afb',
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function avatarColor(id: string): string {
  return AVATAR_COLORS[hash(id) % AVATAR_COLORS.length]!;
}

export function initials(name: string, email?: string): string {
  const source = name?.trim() || email?.trim() || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  const single = parts[0] ?? source;
  if (single.includes('@')) {
    return single.slice(0, 2).toUpperCase();
  }
  return single.slice(0, 2).toUpperCase();
}
