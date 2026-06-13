import chalk, { type ChalkInstance } from 'chalk';

/**
 * Whether colorized output is enabled. Disabled when `NO_COLOR` is set, when
 * stdout is not a TTY, or when `--no-color` was passed. `chalk` does its own
 * detection too, but we gate explicitly so `--json` output is always plain.
 */
function colorEnabled(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
    return false;
  }
  return Boolean(process.stdout.isTTY);
}

let colorOverride: boolean | undefined;

/** Force-disable color (used by `--no-color` / `--json`). */
export function setColor(enabled: boolean): void {
  colorOverride = enabled;
}

function useColor(): boolean {
  return colorOverride ?? colorEnabled();
}

/** A color helper that no-ops when color is disabled. */
export const c: ChalkInstance = chalk;

/** Apply a chalk style only when color is enabled. */
export function paint(style: (s: string) => string, text: string): string {
  return useColor() ? style(text) : text;
}

export const dim = (s: string): string => paint(chalk.dim, s);
export const bold = (s: string): string => paint(chalk.bold, s);
export const green = (s: string): string => paint(chalk.green, s);
export const red = (s: string): string => paint(chalk.red, s);
export const yellow = (s: string): string => paint(chalk.yellow, s);
export const cyan = (s: string): string => paint(chalk.cyan, s);
export const magenta = (s: string): string => paint(chalk.magenta, s);
export const blue = (s: string): string => paint(chalk.blue, s);

/** Write a line to stdout. */
export function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

/** Write a line to stderr. */
export function err(line = ''): void {
  process.stderr.write(`${line}\n`);
}

/** Pretty-print JSON to stdout (the primary path for coding agents). */
export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/** Print a structured error to stderr in JSON form. */
export function printJsonError(code: string, message: string): void {
  process.stderr.write(
    `${JSON.stringify({ error: { code, message } }, null, 2)}\n`,
  );
}

// Strip ANSI codes when measuring width so padding stays aligned with color on.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\[[0-9;]*m/g;
function visibleWidth(s: string): number {
  return s.replace(ANSI_RE, '').length;
}

function padCell(s: string, width: number): string {
  const pad = width - visibleWidth(s);
  return pad > 0 ? s + ' '.repeat(pad) : s;
}

export interface Column {
  header: string;
  /** Cell value extractor (already-painted strings allowed). */
  value: string;
}

/**
 * Render an aligned table. `rows` is an array of cell arrays; `headers` labels
 * each column. Columns are sized to the widest visible cell.
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => {
    let w = visibleWidth(h);
    for (const row of rows) {
      const cell = row[i] ?? '';
      w = Math.max(w, visibleWidth(cell));
    }
    return w;
  });

  const lines: string[] = [];
  lines.push(
    headers
      .map((h, i) => padCell(useColor() ? chalk.dim(h) : h, widths[i]!))
      .join('  ')
      .trimEnd(),
  );
  for (const row of rows) {
    lines.push(
      row
        .map((cell, i) => padCell(cell ?? '', widths[i]!))
        .join('  ')
        .trimEnd(),
    );
  }
  return lines.join('\n');
}

/** Print a table to stdout, or an empty-state note when there are no rows. */
export function printTable(
  headers: string[],
  rows: string[][],
  emptyNote = 'No results.',
): void {
  if (rows.length === 0) {
    out(dim(emptyNote));
    return;
  }
  out(renderTable(headers, rows));
}
