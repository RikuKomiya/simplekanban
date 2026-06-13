import type { PriorityValue } from '@simplekanban/shared';

interface Props {
  priority: PriorityValue;
  size?: number;
  className?: string;
}

/**
 * Linear-style priority glyphs, hand-drawn as SVG:
 * - urgent (1): filled rounded square with a warning bar (orange)
 * - high (2): three bars, all lit
 * - medium (3): three bars, two lit
 * - low (4): three bars, one lit
 * - none (0): three dashed/empty bars
 */
export function PriorityIcon({ priority, size = 16, className }: Props) {
  if (priority === 1) {
    // Urgent — filled warning badge.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
      >
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#f2994a" />
        <rect x="7" y="3.75" width="2" height="5.5" rx="1" fill="#fff" />
        <rect x="7" y="10.75" width="2" height="2" rx="1" fill="#fff" />
      </svg>
    );
  }

  // Bar-chart glyphs for high/medium/low/none.
  const litColor = 'currentColor';
  const dimColor = 'var(--text-tertiary)';
  // number of lit bars
  const lit = priority === 2 ? 3 : priority === 3 ? 2 : priority === 4 ? 1 : 0;
  const bars = [
    { x: 1.5, h: 6, y: 8.5 },
    { x: 6, h: 9, y: 5.5 },
    { x: 10.5, h: 12, y: 2.5 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      {bars.map((b, i) => {
        const isLit = i < lit;
        if (priority === 0) {
          // None — dashed/empty bars.
          return (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width="3.5"
              height={b.h}
              rx="1"
              fill="none"
              stroke={dimColor}
              strokeWidth="1"
              strokeDasharray="1.5 1.5"
            />
          );
        }
        return (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width="3.5"
            height={b.h}
            rx="1"
            fill={isLit ? litColor : dimColor}
            opacity={isLit ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}
