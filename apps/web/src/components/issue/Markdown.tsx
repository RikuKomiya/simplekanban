import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, dependency-free markdown renderer. Supports headings, bold, italic,
 * inline code, fenced code blocks, links, bullet/numbered lists and blockquotes.
 * Intentionally lightweight — the architecture allows a "simple" markdown view.
 * All text is rendered as React nodes (no dangerouslySetInnerHTML), so it is
 * safe against HTML injection.
 */
export function Markdown({ source }: { source: string }) {
  if (!source.trim()) {
    return <span className="text-[var(--text-tertiary)]">No description.</span>;
  }
  return <div className="sk-md flex flex-col gap-2">{renderBlocks(source)}</div>;
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        buf.push(lines[i]!);
        i++;
      }
      i++; // closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs font-mono"
        >
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const text = heading[2]!;
      const cls =
        level === 1
          ? 'text-base font-semibold'
          : level === 2
            ? 'text-md font-semibold'
            : 'text-sm font-semibold';
      blocks.push(
        <div key={key++} className={cls}>
          {renderInline(text)}
        </div>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith('> ')) {
        buf.push(lines[i]!.trimStart().slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-[var(--border-strong)] pl-3 text-[var(--text-secondary)]"
        >
          {buf.map((b, j) => (
            <p key={j}>{renderInline(b)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-0.5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="ml-4 list-decimal space-y-0.5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph (consume consecutive non-empty, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !lines[i]!.trim().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i]!) &&
      !/^\s*[-*]\s+/.test(lines[i]!) &&
      !/^\s*\d+\.\s+/.test(lines[i]!) &&
      !lines[i]!.trimStart().startsWith('> ')
    ) {
      buf.push(lines[i]!);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(buf.join(' '))}
      </p>,
    );
  }

  return blocks;
}

function renderInline(text: string): ReactNode {
  // Tokenize on code / bold / italic / links in priority order.
  const tokens: ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/;

  while (remaining.length) {
    const match = pattern.exec(remaining);
    if (!match) {
      tokens.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }
    const idx = match.index;
    if (idx > 0) {
      tokens.push(<Fragment key={key++}>{remaining.slice(0, idx)}</Fragment>);
    }
    const m = match[0];
    if (m.startsWith('`')) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-[0.85em] font-mono"
        >
          {m.slice(1, -1)}
        </code>,
      );
    } else if (m.startsWith('**')) {
      tokens.push(
        <strong key={key++} className="font-semibold">
          {m.slice(2, -2)}
        </strong>,
      );
    } else if (m.startsWith('*')) {
      tokens.push(
        <em key={key++} className="italic">
          {m.slice(1, -1)}
        </em>,
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(m);
      if (linkMatch) {
        tokens.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--accent)] hover:underline"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }
    remaining = remaining.slice(idx + m.length);
  }

  return tokens;
}
